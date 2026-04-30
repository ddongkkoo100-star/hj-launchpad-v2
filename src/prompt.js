// 프롬프트 합성 모듈 — DEPS 기반 generated 프롬프트 빌더
// 매뉴얼 v6 hj_launchpad_v6_manual.html:716 buildGenerated()를 v0.1 스펙에 맞춰 이식.
//
// Step 1: 함수 정의만. 결과는 더미 입력 시 정상 동작 확인용.
// Step 2~3에서 IndexedDB 결과 저장과 카드 실행 화면이 이 함수를 호출한다.
//
// TODO (Step 3): buildGenerated()에서 자리표시자/의존 처리
//   - {XXX_OUTPUT} 패턴 자리표시자:
//     · XXX가 enabled=false || visible=false → 해당 라인 통째 제거
//     · XXX가 enabled=true && 결과 있음 → 결과 텍스트로 치환
//     · XXX가 enabled=true && 결과 없음 → "(XXX 결과 없음)" 마커
//   - DEPS 배열 기반 합성:
//     · 결과 없는 dep은 합성에서 자동 제외 (현재 동작 유지)
//     · enabled=false || visible=false인 dep도 합성에서 제외
//   현재 G1.prompt에 {AV_OUTPUT}이 있고, AV는 enabled=false이므로
//   Step 3 시점에 첫 적용 대상이 됨.
//   G1.deps에 R1이 있으나 v0.1에서 R1은 free-text 카드라 결과가
//   없으면 자동 스킵되어 자연스럽게 처리됨.

import { CARD_BY_CODE } from '../data/cards.js';
import { DEPS }         from '../data/deps.js';

/**
 * {TODAY}/{YESTERDAY} 등 템플릿 변수를 호출 시점 기준으로 치환.
 * (매뉴얼은 등록 시점에 치환했지만, 우리는 호출 시점에 치환해 날짜가 항상 신선하게.)
 */
export function substituteVars(text, vars) {
  if (!text) return '';
  const today     = (vars && vars.today)     || new Date().toISOString().slice(0, 10);
  const yesterday = (vars && vars.yesterday) || (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  return text
    .replace(/\{TODAY\}/g,     today)
    .replace(/\{YESTERDAY\}/g, yesterday);
}

/**
 * 카드 코드의 generated 프롬프트를 만든다.
 * @param {string} code - 카드 코드
 * @param {Object} results - { 'P1A': '...결과 텍스트...', ... }
 * @param {Object} vars    - { today, yesterday }
 * @returns {string}
 */
export function buildGenerated(code, results = {}, vars = {}) {
  const card = CARD_BY_CODE[code];
  if (!card) return '';

  const base = substituteVars(card.prompt, vars);
  const deps = DEPS[code] || [];

  const blocks = [];
  for (const dep of deps) {
    const depCard = CARD_BY_CODE[dep];
    if (!depCard || !depCard.enabled) continue; // 영구 제외 카드는 스킵
    const txt = (results[dep] || '').trim();
    if (txt) {
      blocks.push(
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `[${dep} 결과]\n` +
        `${txt}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━`
      );
    }
  }

  return blocks.length ? `${base}\n\n${blocks.join('\n\n')}` : base;
}

/**
 * 의존 카드 중 결과가 비어있는 것 목록 (LOCKED/MISSING 판정용 - Step 2에서 사용).
 */
export function missingDeps(code, results = {}) {
  const deps = DEPS[code] || [];
  return deps.filter(d => {
    const c = CARD_BY_CODE[d];
    if (!c || !c.enabled) return false;
    return !(results[d] && results[d].trim());
  });
}
