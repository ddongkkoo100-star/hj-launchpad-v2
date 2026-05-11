// 통합 스토어 — AsyncStorage 기반
// hj-launchpad-v2/src/store.js 에서 포팅 (IndexedDB → AsyncStorage)
//
// 절대 원칙 #2 (다음 카드 자동 진행 금지) 보증:
//   actionStart / actionSave / actionReview / actionRerun 모두
//   명시적 사용자 액션에서만 호출되어야 한다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STATUS,
  CardStatus,
  computeStatus,
  buildDepStateMap,
  dependentsOf,
} from './state-machine';
import { VISIBLE_CARDS, CARD_BY_CODE } from '@/data/cards';

// ── 타입 정의 ─────────────────────────────────────────
export interface Run {
  runId: string;
  startedAt: number;
  endedAt: number | null;
  status: 'active' | 'ended';
  note: string;
}

export interface CardState {
  id: string;
  runId: string;
  cardCode: string;
  status: CardStatus;
  enteredAt: number;
  updatedAt: number;
}

export interface CardResult {
  id: string;
  runId: string;
  cardCode: string;
  payload: string;
  payloadType: string;
  savedAt: number;
  reviewedAt: number | null;
  reviewNote: string;
}

export interface StoreState {
  activeRun: Run | null;
  cardStates: Record<string, CardState>;
  results: Record<string, CardResult>;
}

// ── AsyncStorage 키 ────────────────────────────────────
const KEYS = {
  RUNS: 'hj_runs',
  CARD_STATES: 'hj_card_states',
  RESULTS: 'hj_results',
  SETTINGS: 'hj_settings',
  PORTFOLIO: 'hj_portfolio',
};

// ── 헬퍼 ──────────────────────────────────────────────
function makeRunId(now = new Date()): string {
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const hh   = String(now.getHours()).padStart(2, '0');
  const mi   = String(now.getMinutes()).padStart(2, '0');
  return `run-${yyyy}${mm}${dd}-${hh}${mi}`;
}

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ── 리스너 시스템 ──────────────────────────────────────
type Listener = () => void;
const _listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function emit(): void {
  for (const fn of _listeners) {
    try { fn(); } catch (e) { console.error('[store] listener error', e); }
  }
}

// ── 메모리 캐시 ────────────────────────────────────────
let _activeRun: Run | null = null;
let _cardStatesCache: Map<string, CardState> = new Map();
let _resultsCache: Map<string, CardResult> = new Map();

// ── 초기화 / 로드 ──────────────────────────────────────
export async function loadActiveRun(): Promise<Run | null> {
  const runs: Run[] = await loadJSON(KEYS.RUNS, []);
  const active = runs.find(r => r.status === 'active') || null;
  _activeRun = active;

  if (active) {
    await refreshCaches(active.runId);
  } else {
    _cardStatesCache.clear();
    _resultsCache.clear();
  }
  emit();
  return active;
}

async function refreshCaches(runId: string): Promise<void> {
  _cardStatesCache.clear();
  _resultsCache.clear();

  const allStates: CardState[] = await loadJSON(KEYS.CARD_STATES, []);
  for (const s of allStates) {
    if (s.runId === runId) _cardStatesCache.set(s.cardCode, s);
  }

  const allResults: CardResult[] = await loadJSON(KEYS.RESULTS, []);
  for (const r of allResults) {
    if (r.runId === runId) _resultsCache.set(r.cardCode, r);
  }
}

export async function startNewRun(note = ''): Promise<Run> {
  const runs: Run[] = await loadJSON(KEYS.RUNS, []);
  const existing = runs.find(r => r.status === 'active');
  if (existing) {
    _activeRun = existing;
    await refreshCaches(existing.runId);
    emit();
    return existing;
  }

  const now = Date.now();
  const run: Run = {
    runId: makeRunId(),
    startedAt: now,
    endedAt: null,
    status: 'active',
    note: note || '',
  };
  runs.push(run);
  await saveJSON(KEYS.RUNS, runs);
  _activeRun = run;

  // visible 카드 17장 cardStates 일괄 생성
  const states: CardState[] = [];
  for (const card of VISIBLE_CARDS) {
    states.push({
      id: `${run.runId}::${card.code}`,
      runId: run.runId,
      cardCode: card.code,
      status: STATUS.LOCKED,
      enteredAt: now,
      updatedAt: now,
    });
  }

  // deps 검사 — 의존 없는 카드는 즉시 READY
  const stateMap: Record<string, CardStatus> = {};
  for (const s of states) stateMap[s.cardCode] = s.status;
  for (const s of states) {
    const next = computeStatus(s.cardCode, stateMap, null);
    s.status = next;
    stateMap[s.cardCode] = next;
  }

  // 기존 states에 새 run states 추가
  const allStates: CardState[] = await loadJSON(KEYS.CARD_STATES, []);
  allStates.push(...states);
  await saveJSON(KEYS.CARD_STATES, allStates);

  await refreshCaches(run.runId);
  emit();
  return run;
}

// ── 조회 ───────────────────────────────────────────────
export function getActiveRun(): Run | null { return _activeRun; }

export function getCardStatus(cardCode: string): CardStatus | null {
  const s = _cardStatesCache.get(cardCode);
  return s ? s.status : null;
}

export function getCardState(cardCode: string): CardState | null {
  return _cardStatesCache.get(cardCode) || null;
}

export function getCardResult(cardCode: string): CardResult | null {
  return _resultsCache.get(cardCode) || null;
}

export function getAllCardStates(): CardState[] {
  return Array.from(_cardStatesCache.values());
}

// ── 내부 상태 변경 ─────────────────────────────────────
async function setCardStatus(cardCode: string, newStatus: CardStatus): Promise<void> {
  if (!_activeRun) throw new Error('No active run');
  const now = Date.now();
  const existing = _cardStatesCache.get(cardCode);
  const row: CardState = existing
    ? { ...existing, status: newStatus, updatedAt: now }
    : {
        id: `${_activeRun.runId}::${cardCode}`,
        runId: _activeRun.runId,
        cardCode,
        status: newStatus,
        enteredAt: now,
        updatedAt: now,
      };

  _cardStatesCache.set(cardCode, row);

  // AsyncStorage 업데이트
  const allStates: CardState[] = await loadJSON(KEYS.CARD_STATES, []);
  const idx = allStates.findIndex(s => s.id === row.id);
  if (idx >= 0) allStates[idx] = row;
  else allStates.push(row);
  await saveJSON(KEYS.CARD_STATES, allStates);
}

async function recomputeDependents(changedCode: string): Promise<void> {
  const stateMap = buildDepStateMap(Array.from(_cardStatesCache.values()));
  const dependents = dependentsOf(changedCode);
  for (const code of dependents) {
    const card = CARD_BY_CODE[code];
    if (!card || !card.visible) continue;
    const current = _cardStatesCache.get(code);
    const currentStatus = current ? current.status : null;
    const next = computeStatus(code, stateMap, currentStatus);
    if (next !== currentStatus) {
      await setCardStatus(code, next);
    }
  }
}

// ── 사용자 명시 액션 ───────────────────────────────────

// 시작
export async function actionStart(cardCode: string): Promise<void> {
  const cur = getCardStatus(cardCode);
  if (cur !== STATUS.READY && cur !== STATUS.PASTED) {
    throw new Error(`Cannot start from ${cur}`);
  }
  await setCardStatus(cardCode, STATUS.RUNNING);
  emit();
}

// paste 입력
export async function actionPaste(cardCode: string, payload: string): Promise<void> {
  const cur = getCardStatus(cardCode);
  if (cur !== STATUS.RUNNING && cur !== STATUS.PASTED && cur !== STATUS.MISSING) {
    return;
  }
  const trimmed = (payload || '').trim();
  if (trimmed.length > 0 && cur !== STATUS.PASTED) {
    await setCardStatus(cardCode, STATUS.PASTED);
    emit();
  }
}

// 저장
export async function actionSave(
  cardCode: string,
  payload: string,
  payloadType = 'ai_paste'
): Promise<{ ok: boolean; reason?: string }> {
  if (!_activeRun) throw new Error('No active run');
  const cur = getCardStatus(cardCode);
  if (cur !== STATUS.PASTED && cur !== STATUS.RUNNING && cur !== STATUS.MISSING) {
    throw new Error(`Cannot save from ${cur}`);
  }
  const trimmed = (payload || '').trim();
  if (trimmed.length === 0) {
    await setCardStatus(cardCode, STATUS.MISSING);
    emit();
    return { ok: false, reason: 'empty' };
  }

  const now = Date.now();
  const row: CardResult = {
    id: `${_activeRun.runId}::${cardCode}`,
    runId: _activeRun.runId,
    cardCode,
    payload: trimmed,
    payloadType,
    savedAt: now,
    reviewedAt: null,
    reviewNote: '',
  };

  _resultsCache.set(cardCode, row);
  const allResults: CardResult[] = await loadJSON(KEYS.RESULTS, []);
  const idx = allResults.findIndex(r => r.id === row.id);
  if (idx >= 0) allResults[idx] = row;
  else allResults.push(row);
  await saveJSON(KEYS.RESULTS, allResults);

  await setCardStatus(cardCode, STATUS.SAVED);
  await recomputeDependents(cardCode);
  emit();
  return { ok: true };
}

// 검토 완료
export async function actionReview(cardCode: string, reviewNote = ''): Promise<void> {
  const cur = getCardStatus(cardCode);
  if (cur !== STATUS.SAVED && cur !== STATUS.WARNING) {
    throw new Error(`Cannot review from ${cur}`);
  }
  const result = _resultsCache.get(cardCode);
  if (result) {
    const updated: CardResult = { ...result, reviewedAt: Date.now(), reviewNote };
    _resultsCache.set(cardCode, updated);
    const allResults: CardResult[] = await loadJSON(KEYS.RESULTS, []);
    const idx = allResults.findIndex(r => r.id === updated.id);
    if (idx >= 0) allResults[idx] = updated;
    await saveJSON(KEYS.RESULTS, allResults);
  }
  await setCardStatus(cardCode, STATUS.REVIEWED);
  await recomputeDependents(cardCode);
  emit();
}

// 재실행
export async function actionRerun(cardCode: string): Promise<void> {
  if (!_activeRun) throw new Error('No active run');
  _resultsCache.delete(cardCode);
  const allResults: CardResult[] = await loadJSON(KEYS.RESULTS, []);
  const filtered = allResults.filter(r => !(r.runId === _activeRun!.runId && r.cardCode === cardCode));
  await saveJSON(KEYS.RESULTS, filtered);

  const stateMap = buildDepStateMap(Array.from(_cardStatesCache.values()));
  const next = computeStatus(cardCode, stateMap, null);
  await setCardStatus(cardCode, next);
  emit();
}

// ── 설정 ───────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const settings: Record<string, string> = await loadJSON(KEYS.SETTINGS, {});
  return settings[key] ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const settings: Record<string, string> = await loadJSON(KEYS.SETTINGS, {});
  settings[key] = value;
  await saveJSON(KEYS.SETTINGS, settings);
}

// ── 포트폴리오 ─────────────────────────────────────────
export async function savePortfolioReport(report: string): Promise<void> {
  await saveJSON(KEYS.PORTFOLIO, { report, savedAt: Date.now() });
}

export async function loadPortfolioReport(): Promise<{ report: string; savedAt: number } | null> {
  return loadJSON(KEYS.PORTFOLIO, null);
}

// ── Export / Import ────────────────────────────────────
export async function exportAllData(): Promise<object> {
  const runs: Run[] = await loadJSON(KEYS.RUNS, []);
  const cardStates: CardState[] = await loadJSON(KEYS.CARD_STATES, []);
  const results: CardResult[] = await loadJSON(KEYS.RESULTS, []);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: 'v1-native',
    runs,
    cardStates,
    results,
  };
}

export async function importAllData(data: {
  runs: Run[];
  cardStates: CardState[];
  results: CardResult[];
}): Promise<void> {
  await saveJSON(KEYS.RUNS, data.runs || []);
  await saveJSON(KEYS.CARD_STATES, data.cardStates || []);
  await saveJSON(KEYS.RESULTS, data.results || []);
  await loadActiveRun();
}

export async function deleteRunCascade(runId: string): Promise<void> {
  const runs: Run[] = await loadJSON(KEYS.RUNS, []);
  await saveJSON(KEYS.RUNS, runs.filter(r => r.runId !== runId));
  const states: CardState[] = await loadJSON(KEYS.CARD_STATES, []);
  await saveJSON(KEYS.CARD_STATES, states.filter(s => s.runId !== runId));
  const results: CardResult[] = await loadJSON(KEYS.RESULTS, []);
  await saveJSON(KEYS.RESULTS, results.filter(r => r.runId !== runId));
  await loadActiveRun();
}

export async function deleteEverything(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.RUNS, KEYS.CARD_STATES, KEYS.RESULTS]);
  _activeRun = null;
  _cardStatesCache.clear();
  _resultsCache.clear();
  emit();
}

export async function getAllRuns(): Promise<Run[]> {
  return loadJSON(KEYS.RUNS, []);
}
