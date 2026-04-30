// HJ 런치패드 v0.1 — 진입점
// 1) Service Worker 등록 (있으면)
// 2) 라우터 시작
// 3) 콘솔에 데이터 점검 정보 출력 (Step 1 검수용)

import { initRouter } from './src/router.js';
import { CARDS, VISIBLE_CARDS, CARD_BY_CODE } from './data/cards.js';
import { DEPS }                                from './data/deps.js';

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    console.log('[SW] registered:', reg.scope);
  } catch (err) {
    console.warn('[SW] register failed:', err);
  }
}

function debugReport() {
  const visible        = CARDS.filter(c => c.visible).length;
  const enabledFalse   = CARDS.filter(c => !c.enabled).map(c => c.code);
  const defenseLine    = CARDS.filter(c => c.defenseLine).map(c => c.code);
  const tasksTargets   = CARDS.filter(c => c.isTasksTarget).map(c => c.code);
  const groupCount     = CARDS.reduce((acc, c) => {
    acc[c.group] = (acc[c.group] || 0) + 1;
    return acc;
  }, {});

  console.group('%c[HJ 런치패드 Step 1] 데이터 점검', 'color:#00c8ff;font-weight:bold');
  console.log('전체 카드:',           CARDS.length);
  console.log('visible 카드:',        visible, '(목표 17)');
  console.log('VISIBLE_CARDS 길이:',  VISIBLE_CARDS.length);
  console.log('enabled=false:',       enabledFalse, '(목표 [AV, I3])');
  console.log('defenseLine=true:',    defenseLine, '(목표 [G1, C1, I2])');
  console.log('isTasksTarget=true:',  tasksTargets, '(목표 [P1A,P1B,P2,P3,D1,N0])');
  console.log('group 카운트:',        groupCount);
  console.log('DEPS 노드 수:',        Object.keys(DEPS).length);
  console.log('CARD_BY_CODE 노드 수:', Object.keys(CARD_BY_CODE).length);
  console.groupEnd();
}

window.addEventListener('DOMContentLoaded', () => {
  initRouter();
  debugReport();
  registerSW();
});
