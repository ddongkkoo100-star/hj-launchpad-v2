// 카드 상태 머신 — HJ 런치패드 v2 Step 2
//
// 8단계 상태:
//   LOCKED   : deps 미충족
//   READY    : deps 충족, 사용자 시작 대기
//   RUNNING  : 사용자가 "시작" 클릭 — 진행 중
//   PASTED   : textarea에 결과 붙여넣음 (저장 전)
//   SAVED    : 저장됨
//   REVIEWED : 사용자가 "검토 완료" 클릭
//   MISSING  : 저장 시 검증 실패 (Step 2는 룰 자리만)
//   WARNING  : 사후 검증 룰 매치 (Step 2는 룰 자리만, 자동 전이 없음)
//
// computeStatus()는 절대 RUNNING을 반환하지 않는다.
//   → 자동 진행 금지의 기술적 보증 (절대 원칙 #2)

import { CARD_BY_CODE } from '../data/cards.js';
import { DEPS }         from '../data/deps.js';

export const STATUS = Object.freeze({
  LOCKED:   'LOCKED',
  READY:    'READY',
  RUNNING:  'RUNNING',
  PASTED:   'PASTED',
  SAVED:    'SAVED',
  REVIEWED: 'REVIEWED',
  MISSING:  'MISSING',
  WARNING:  'WARNING',
});

// 8상태별 UI 메타데이터
export const STATUS_META = {
  LOCKED:   { label: '잠김',     icon: '🔒', cls: 'status-locked'   },
  READY:    { label: '준비',     icon: '▶',  cls: 'status-ready'    },
  RUNNING:  { label: '진행 중',   icon: '⋯',  cls: 'status-running'  },
  PASTED:   { label: '붙여넣음', icon: '📋', cls: 'status-pasted'   },
  SAVED:    { label: '저장됨',   icon: '💾', cls: 'status-saved'    },
  REVIEWED: { label: '검토 완료', icon: '✓',  cls: 'status-reviewed' },
  MISSING:  { label: '누락',     icon: '⚠',  cls: 'status-missing'  },
  WARNING:  { label: '점검 필요', icon: '⚠',  cls: 'status-warning'  },
};

// dep "충족" 판정 (Step 3-A: 방어선 카드 차등 처리)
//
//   일반 dep (defenseLine !== true): SAVED 또는 REVIEWED → 충족
//   방어선 dep (defenseLine === true): REVIEWED 만 → 충족 (SAVED만으로는 부족)
//
// 즉, deps 배열에 G1/C1/I2 같은 방어선 카드가 있으면, 그 카드가 사용자에게
// 명시적으로 "검토 완료"되어야만 후속 카드가 unlock된다 (절대 원칙 #3).
function isDepSatisfied(depCard, depState) {
  if (!depState) return false;
  if (depCard && depCard.defenseLine === true) {
    return depState === STATUS.REVIEWED;
  }
  return depState === STATUS.SAVED || depState === STATUS.REVIEWED;
}

/**
 * 카드 상태 계산 — 순수 함수, DB I/O 없음.
 *
 * 규칙:
 *   1) ownState가 null/LOCKED 이외인 경우 그대로 유지 (수동 전이 보존)
 *   2) ownState가 null/LOCKED 이고 모든 deps가 isDepSatisfied → READY
 *      · 일반 dep: SAVED 또는 REVIEWED 충족
 *      · 방어선 dep (G1/C1/I2): REVIEWED 만 충족 (Step 3-A)
 *   3) 그 외 → LOCKED
 *   4) 절대 RUNNING을 반환하지 않는다 (자동 진행 금지)
 *
 * @param {string} cardCode - 카드 코드
 * @param {Object} depStateMap - { 'P1A': 'SAVED', 'P1B': 'LOCKED', ... }
 * @param {string|null} ownState - 현재 카드의 상태 (DB에 저장된 값, 없으면 null)
 * @returns {string} 새 상태
 */
export function computeStatus(cardCode, depStateMap = {}, ownState = null) {
  const card = CARD_BY_CODE[cardCode];
  if (!card) return STATUS.LOCKED;

  // (1) 수동 전이 보존: LOCKED/null 외의 상태는 그대로 유지
  if (ownState && ownState !== STATUS.LOCKED) {
    if (ownState === STATUS.RUNNING) {
      // 안전장치: 직전 ownState가 RUNNING이어도 그대로 유지 (사용자가 명시적으로 진입)
      return STATUS.RUNNING;
    }
    return ownState;
  }

  // (2)(3) deps 검사 — 방어선 dep은 REVIEWED만 충족
  const deps = (DEPS[cardCode] || []).filter(depCode => {
    const dep = CARD_BY_CODE[depCode];
    // enabled=false 카드는 의존에서 제외 (예: AV)
    return dep && dep.enabled;
  });

  if (deps.length === 0) {
    return STATUS.READY;
  }

  const allSatisfied = deps.every(depCode => {
    const depCard = CARD_BY_CODE[depCode];
    const depStatus = depStateMap[depCode];
    return isDepSatisfied(depCard, depStatus);
  });

  return allSatisfied ? STATUS.READY : STATUS.LOCKED;
}

/**
 * 전이 가능 여부 (수동 액션 검증용).
 * UI 버튼 활성/비활성 결정에 사용.
 *
 * @param {string} from - 현재 상태
 * @param {string} to   - 목표 상태
 * @returns {boolean}
 */
export function canTransition(from, to) {
  const allowed = TRANSITIONS[from] || new Set();
  return allowed.has(to);
}

const TRANSITIONS = {
  [STATUS.LOCKED]:   new Set([STATUS.READY]),                   // deps 충족 시 자동
  [STATUS.READY]:    new Set([STATUS.RUNNING]),                 // 사용자 "시작"
  [STATUS.RUNNING]:  new Set([STATUS.PASTED, STATUS.READY]),    // paste 또는 재실행 취소
  [STATUS.PASTED]:   new Set([STATUS.SAVED, STATUS.MISSING, STATUS.RUNNING]), // 저장 / 검증 실패 / 재paste
  [STATUS.SAVED]:    new Set([STATUS.REVIEWED, STATUS.WARNING, STATUS.READY]), // 검토 / 룰 매치 / 재실행
  [STATUS.REVIEWED]: new Set([STATUS.READY]),                   // 재실행만
  [STATUS.MISSING]:  new Set([STATUS.PASTED, STATUS.READY]),    // 다시 paste / 재실행
  [STATUS.WARNING]:  new Set([STATUS.REVIEWED, STATUS.READY]),  // 검토 강제 / 재실행
};

/**
 * 의존 카드들의 상태 맵 빌드 헬퍼.
 * @param {Array} cardStateRows - DB의 cardStates 행 배열
 * @returns {Object} { cardCode: status }
 */
export function buildDepStateMap(cardStateRows) {
  const map = {};
  for (const row of cardStateRows || []) {
    map[row.cardCode] = row.status;
  }
  return map;
}

/**
 * 한 카드의 상태가 변경되어 영향받을 수 있는 카드 목록.
 * (재계산 대상 — UI 새로고침 범위 제한용)
 *
 * @param {string} changedCode - 방금 상태가 바뀐 카드
 * @returns {string[]} 영향받는 카드 코드들 (이 카드를 dep으로 가진 카드들)
 */
export function dependentsOf(changedCode) {
  const dependents = [];
  for (const code in DEPS) {
    if ((DEPS[code] || []).includes(changedCode)) {
      dependents.push(code);
    }
  }
  return dependents;
}
