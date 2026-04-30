// 통합 스토어 — DB + 상태 머신 + 캐시
// UI 레이어(views/*.js)는 이 모듈만 호출. db.js와 state-machine.js를 직접 호출하지 않는다.
//
// 절대 원칙 #2 (다음 카드 자동 진행 금지) 보증:
//   - actionStart() / actionSave() / actionReview() / actionRerun() 모두
//     명시적 사용자 액션에서만 호출되어야 한다.
//   - 의존 카드 SAVED 시에도 다음 카드를 자동으로 RUNNING으로 만들지 않는다.

import * as db from './db.js';
import {
  STATUS, computeStatus, canTransition,
  buildDepStateMap, dependentsOf,
} from './state-machine.js';
import { VISIBLE_CARDS, CARD_BY_CODE } from '../data/cards.js';

const RUN_ID_PREFIX = 'run-';

// ── 메모리 캐시 ─────────────────────────────────────
let _activeRun       = null;       // run row
let _cardStatesCache = new Map();  // cardCode → cardState row
let _resultsCache    = new Map();  // cardCode → result row
const _listeners     = new Set();  // 상태 변경 구독자

function emit() {
  for (const fn of _listeners) {
    try { fn(); } catch (e) { console.error('[store] listener error', e); }
  }
}

export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ── run 시작 / 로드 ────────────────────────────────
function makeRunId(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const hh   = String(now.getHours()).padStart(2, '0');
  const mi   = String(now.getMinutes()).padStart(2, '0');
  return `${RUN_ID_PREFIX}${yyyy}${mm}${dd}-${hh}${mi}`;
}

/**
 * 활성 run을 로드. 없으면 null.
 */
export async function loadActiveRun() {
  const run = await db.getActiveRun();
  if (!run) {
    _activeRun = null;
    _cardStatesCache.clear();
    _resultsCache.clear();
    return null;
  }
  _activeRun = run;
  await refreshCaches();
  emit();
  return run;
}

/**
 * 새 run 시작.
 *  - runs 1개 추가
 *  - VISIBLE_CARDS(17장)에 대해 cardStates 17개 일괄 생성
 *  - 초기 상태 계산 (P1A, R1만 READY, 나머지 LOCKED)
 *
 * 이미 active run이 있으면 그것을 재사용 (중복 시작 방지).
 */
export async function startNewRun(note = '') {
  const existing = await db.getActiveRun();
  if (existing) {
    _activeRun = existing;
    await refreshCaches();
    emit();
    return existing;
  }

  const now = Date.now();
  const run = {
    runId: makeRunId(),
    startedAt: now,
    endedAt: null,
    status: 'active',
    note: note || '',
  };
  await db.addRun(run);
  _activeRun = run;

  // visible 카드 17장 cardStates 일괄 생성
  const states = [];
  // 초기 단계: dep 정보 없음 → 모두 LOCKED로 일단 만들고, 그 다음 deps 검사로 READY 승격
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
  const stateMap = {};
  for (const s of states) stateMap[s.cardCode] = s.status;
  for (const s of states) {
    const next = computeStatus(s.cardCode, stateMap, null);
    s.status = next;
  }

  await db.bulkPutCardStates(states);
  await refreshCaches();
  emit();
  return run;
}

async function refreshCaches() {
  _cardStatesCache.clear();
  _resultsCache.clear();
  if (!_activeRun) return;
  const states = await db.getCardStatesByRun(_activeRun.runId);
  for (const s of states) _cardStatesCache.set(s.cardCode, s);
  const results = await db.getResultsByRun(_activeRun.runId);
  for (const r of results) _resultsCache.set(r.cardCode, r);
}

// ── 조회 ───────────────────────────────────────────
export function getActiveRun() { return _activeRun; }

export function getCardStatus(cardCode) {
  const s = _cardStatesCache.get(cardCode);
  return s ? s.status : null;
}

export function getCardState(cardCode) {
  return _cardStatesCache.get(cardCode) || null;
}

export function getCardResult(cardCode) {
  return _resultsCache.get(cardCode) || null;
}

export function getAllCardStates() {
  return Array.from(_cardStatesCache.values());
}

// ── 액션 ───────────────────────────────────────────
async function setCardStatus(cardCode, newStatus) {
  if (!_activeRun) throw new Error('No active run');
  const now = Date.now();
  const existing = _cardStatesCache.get(cardCode);
  const row = existing
    ? { ...existing, status: newStatus, updatedAt: now }
    : {
        id: `${_activeRun.runId}::${cardCode}`,
        runId: _activeRun.runId,
        cardCode,
        status: newStatus,
        enteredAt: now,
        updatedAt: now,
      };
  await db.putCardState(row);
  _cardStatesCache.set(cardCode, row);
}

/**
 * 의존 카드들의 상태를 재계산해 자동 전이 (LOCKED → READY).
 * 절대 RUNNING으로 자동 전이하지 않는다.
 */
async function recomputeDependents(changedCode) {
  const stateMap = buildDepStateMap(Array.from(_cardStatesCache.values()));
  const dependents = dependentsOf(changedCode);
  for (const code of dependents) {
    const card = CARD_BY_CODE[code];
    if (!card || !card.visible) continue;
    const current = _cardStatesCache.get(code);
    const currentStatus = current ? current.status : null;
    // computeStatus의 (1) 규칙: LOCKED/null만 deps 검사 → 실제 전이는 LOCKED → READY 한 방향만 일어남
    const next = computeStatus(code, stateMap, currentStatus);
    if (next !== currentStatus) {
      await setCardStatus(code, next);
    }
  }
}

// 사용자 명시 액션: 시작
export async function actionStart(cardCode) {
  const cur = getCardStatus(cardCode);
  if (cur !== STATUS.READY && cur !== STATUS.PASTED) {
    // PASTED에서 다시 시작 누르면 RUNNING으로 (textarea에 이미 내용 있음)
    if (!canTransition(cur, STATUS.RUNNING)) {
      throw new Error(`Cannot start from ${cur}`);
    }
  }
  await setCardStatus(cardCode, STATUS.RUNNING);
  emit();
}

// 사용자 명시 액션: paste 입력 (textarea oninput)
export async function actionPaste(cardCode, payload) {
  const cur = getCardStatus(cardCode);
  // RUNNING/MISSING/PASTED 어디서든 paste 가능
  if (cur !== STATUS.RUNNING && cur !== STATUS.PASTED && cur !== STATUS.MISSING) {
    return; // 무시 (READY 등에서는 paste 무시)
  }
  // 아직 DB에 results 저장 안 함 — 저장 버튼 클릭 시 putResult.
  // 단, 빈 문자열이 아니면 PASTED 상태로 전이.
  const trimmed = (payload || '').trim();
  if (trimmed.length > 0 && cur !== STATUS.PASTED) {
    await setCardStatus(cardCode, STATUS.PASTED);
    emit();
  }
}

// 사용자 명시 액션: 저장
export async function actionSave(cardCode, payload, payloadType = 'ai_paste') {
  if (!_activeRun) throw new Error('No active run');
  const cur = getCardStatus(cardCode);
  if (cur !== STATUS.PASTED && cur !== STATUS.RUNNING && cur !== STATUS.MISSING) {
    throw new Error(`Cannot save from ${cur}`);
  }
  const trimmed = (payload || '').trim();
  if (trimmed.length === 0) {
    // 빈 내용 저장은 MISSING 처리
    await setCardStatus(cardCode, STATUS.MISSING);
    emit();
    return { ok: false, reason: 'empty' };
  }

  const now = Date.now();
  const row = {
    id: `${_activeRun.runId}::${cardCode}`,
    runId: _activeRun.runId,
    cardCode,
    payload: trimmed,
    payloadType,
    tokenCount: null, // Step 2 범위 밖
    savedAt: now,
    reviewedAt: null,
    reviewNote: '',
  };
  await db.putResult(row);
  _resultsCache.set(cardCode, row);

  // Step 2: 검증 룰은 자리만. 자동 WARNING 전이 없음. 일단 SAVED.
  await setCardStatus(cardCode, STATUS.SAVED);

  // 의존 카드들 자동 LOCKED→READY 승격
  await recomputeDependents(cardCode);

  emit();
  return { ok: true };
}

// 사용자 명시 액션: 검토 완료
export async function actionReview(cardCode, reviewNote = '') {
  const cur = getCardStatus(cardCode);
  if (cur !== STATUS.SAVED && cur !== STATUS.WARNING) {
    throw new Error(`Cannot review from ${cur}`);
  }
  const result = _resultsCache.get(cardCode);
  if (result) {
    const updated = { ...result, reviewedAt: Date.now(), reviewNote };
    await db.putResult(updated);
    _resultsCache.set(cardCode, updated);
  }
  await setCardStatus(cardCode, STATUS.REVIEWED);

  // REVIEWED도 deps 충족 상태이므로 의존 카드 재평가
  await recomputeDependents(cardCode);

  emit();
}

// 사용자 명시 액션: 재실행 (현재 카드 result 삭제 + READY로 리셋)
//   - 의존 카드들에는 cascade 영향 주지 않음 (사용자 지시 5번)
export async function actionRerun(cardCode) {
  if (!_activeRun) throw new Error('No active run');
  await db.deleteResult(_activeRun.runId, cardCode);
  _resultsCache.delete(cardCode);
  // dep 검사로 READY 또는 LOCKED 결정
  const stateMap = buildDepStateMap(Array.from(_cardStatesCache.values()));
  const next = computeStatus(cardCode, stateMap, null);
  await setCardStatus(cardCode, next);
  emit();
}

// ── 디버그 ─────────────────────────────────────────
export async function debugReset() {
  await db.deleteEverything();
  _activeRun = null;
  _cardStatesCache.clear();
  _resultsCache.clear();
  emit();
}

export const _debug = {
  cache: () => ({
    activeRun: _activeRun,
    cardStates: Array.from(_cardStatesCache.values()),
    results: Array.from(_resultsCache.values()),
  }),
};
