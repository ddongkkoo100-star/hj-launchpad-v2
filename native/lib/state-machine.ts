// 카드 상태 머신 — hj-launchpad-v2/src/state-machine.js 에서 포팅
//
// 8단계 상태:
//   LOCKED   : deps 미충족
//   READY    : deps 충족, 사용자 시작 대기
//   RUNNING  : 사용자가 "시작" 클릭 — 진행 중
//   PASTED   : textarea에 결과 붙여넣음 (저장 전)
//   SAVED    : 저장됨
//   REVIEWED : 사용자가 "검토 완료" 클릭
//   MISSING  : 저장 시 검증 실패
//   WARNING  : 사후 검증 룰 매치
//
// computeStatus()는 절대 RUNNING을 반환하지 않는다.
//   → 자동 진행 금지의 기술적 보증 (절대 원칙 #2)

import { CARD_BY_CODE } from '@/data/cards';
import { DEPS } from '@/data/deps';

export type CardStatus =
  | 'LOCKED'
  | 'READY'
  | 'RUNNING'
  | 'PASTED'
  | 'SAVED'
  | 'REVIEWED'
  | 'MISSING'
  | 'WARNING';

export const STATUS = {
  LOCKED:   'LOCKED'   as CardStatus,
  READY:    'READY'    as CardStatus,
  RUNNING:  'RUNNING'  as CardStatus,
  PASTED:   'PASTED'   as CardStatus,
  SAVED:    'SAVED'    as CardStatus,
  REVIEWED: 'REVIEWED' as CardStatus,
  MISSING:  'MISSING'  as CardStatus,
  WARNING:  'WARNING'  as CardStatus,
};

export interface StatusMeta {
  label: string;
  icon: string;
  color: string;
}

// 8상태별 UI 메타데이터
export const STATUS_META: Record<CardStatus, StatusMeta> = {
  LOCKED:   { label: '잠김',     icon: '🔒', color: '#475569' },
  READY:    { label: '준비',     icon: '▶',  color: '#00C8FF' },
  RUNNING:  { label: '진행 중',  icon: '⋯',  color: '#F59E0B' },
  PASTED:   { label: '붙여넣음', icon: '📋', color: '#8B5CF6' },
  SAVED:    { label: '저장됨',   icon: '💾', color: '#22C55E' },
  REVIEWED: { label: '검토 완료', icon: '✓', color: '#10B981' },
  MISSING:  { label: '누락',     icon: '⚠',  color: '#EF4444' },
  WARNING:  { label: '점검 필요', icon: '⚠', color: '#F59E0B' },
};

// dep "충족" 판정
//   일반 dep: SAVED 또는 REVIEWED → 충족
//   방어선 dep (defenseLine === true): REVIEWED 만 → 충족
function isDepSatisfied(depCode: string, depStatus: CardStatus | undefined): boolean {
  if (!depStatus) return false;
  const depCard = CARD_BY_CODE[depCode];
  if (depCard && depCard.defenseLine === true) {
    return depStatus === STATUS.REVIEWED;
  }
  return depStatus === STATUS.SAVED || depStatus === STATUS.REVIEWED;
}

/**
 * 카드 상태 계산 — 순수 함수, I/O 없음.
 */
export function computeStatus(
  cardCode: string,
  depStateMap: Record<string, CardStatus> = {},
  ownState: CardStatus | null = null
): CardStatus {
  const card = CARD_BY_CODE[cardCode];
  if (!card) return STATUS.LOCKED;

  // (1) 수동 전이 보존: LOCKED/null 외의 상태는 그대로 유지
  if (ownState && ownState !== STATUS.LOCKED) {
    return ownState;
  }

  // (2)(3) deps 검사
  const deps = (DEPS[cardCode] || []).filter(depCode => {
    const dep = CARD_BY_CODE[depCode];
    return dep && dep.enabled;
  });

  if (deps.length === 0) {
    return STATUS.READY;
  }

  const allSatisfied = deps.every(depCode =>
    isDepSatisfied(depCode, depStateMap[depCode])
  );

  return allSatisfied ? STATUS.READY : STATUS.LOCKED;
}

/**
 * 전이 가능 여부 (수동 액션 검증용).
 */
export function canTransition(from: CardStatus, to: CardStatus): boolean {
  const allowed = TRANSITIONS[from] || new Set<CardStatus>();
  return allowed.has(to);
}

const TRANSITIONS: Record<CardStatus, Set<CardStatus>> = {
  LOCKED:   new Set([STATUS.READY]),
  READY:    new Set([STATUS.RUNNING]),
  RUNNING:  new Set([STATUS.PASTED, STATUS.READY]),
  PASTED:   new Set([STATUS.SAVED, STATUS.MISSING, STATUS.RUNNING]),
  SAVED:    new Set([STATUS.REVIEWED, STATUS.WARNING, STATUS.READY]),
  REVIEWED: new Set([STATUS.READY]),
  MISSING:  new Set([STATUS.PASTED, STATUS.READY]),
  WARNING:  new Set([STATUS.REVIEWED, STATUS.READY]),
};

/**
 * 의존 카드들의 상태 맵 빌드 헬퍼.
 */
export function buildDepStateMap(
  cardStateRows: Array<{ cardCode: string; status: CardStatus }>
): Record<string, CardStatus> {
  const map: Record<string, CardStatus> = {};
  for (const row of cardStateRows || []) {
    map[row.cardCode] = row.status;
  }
  return map;
}

/**
 * 한 카드의 상태가 변경되어 영향받을 수 있는 카드 목록.
 */
export function dependentsOf(changedCode: string): string[] {
  const dependents: string[] = [];
  for (const code in DEPS) {
    if ((DEPS[code] || []).includes(changedCode)) {
      dependents.push(code);
    }
  }
  return dependents;
}
