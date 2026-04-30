// 프롬프트 합성 모듈 — DEPS 기반 generated 프롬프트 빌더
// 매뉴얼 v6 hj_launchpad_v6_manual.html:716 buildGenerated()를 v0.1 스펙에 맞춰 이식.
// Step 3-A: {XXX_OUTPUT} 자리표시자 치환 + DEPS 합성 동시 처리.

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
 * prompt 본문 안의 {XXX_OUTPUT} 자리표시자를 results로 치환.
 *
 *   - XXX가 cards.js에 없거나 enabled=false || visible=false → 자리표시자 라인 통째 제거
 *   - XXX의 결과 있음 → 결과 텍스트로 치환
 *   - XXX의 결과 없음 → "(XXX 결과 없음)" 마커로 치환 + 콘솔 경고
 *
 * @param {string} text - 본문 (이미 substituteVars된 상태 권장)
 * @param {Object} results - { 'P1A': '...결과...', ... }
 * @param {string} ownerCode - 호출자 카드 코드 (경고 메시지용)
 * @returns {string}
 */
export function substitutePlaceholders(text, results = {}, ownerCode = '') {
  if (!text) return '';

  // 패턴: {XXX_OUTPUT} (XXX는 영문 대문자/숫자/하이픈/언더스코어)
  // 라인 단위 처리를 위해 라인 분리
  const placeholderRe = /\{([A-Z0-9_-]+)_OUTPUT\}/g;
  const lines = text.split('\n');
  const outLines = [];

  for (const line of lines) {
    // 이 라인의 모든 자리표시자 검사
    const matches = [...line.matchAll(placeholderRe)];
    if (matches.length === 0) {
      outLines.push(line);
      continue;
    }

    // 라인 내 모든 자리표시자가 disabled/invisible 카드면 라인 통째 제거
    let allDisabled = true;
    for (const m of matches) {
      const code = m[1];
      const c = CARD_BY_CODE[code];
      if (c && c.enabled !== false && c.visible !== false) {
        allDisabled = false;
        break;
      }
    }
    if (allDisabled) {
      // 라인 제거 (예: G1 prompt의 "{T1_OUTPUT} {AV_OUTPUT} {V1_OUTPUT} {P0_OUTPUT}" 같은 라인은
      //               AV가 disabled여도 다른 자리표시자가 enabled라면 살림)
      continue;
    }

    // 살리는 라인 — 자리표시자 각각 치환
    const replaced = line.replace(placeholderRe, (whole, code) => {
      const c = CARD_BY_CODE[code];
      if (!c || c.enabled === false) {
        // disabled 카드 자리표시자는 빈 문자열로 (줄에서 사라짐)
        return '';
      }
      const txt = (results[code] || '').trim();
      if (txt) {
        return txt;
      }
      // 결과 없음
      console.warn(`[prompt] ${ownerCode} 카드: ${code} 결과 없음 — 마커로 대체`);
      return `(${code} 결과 없음)`;
    });

    outLines.push(replaced);
  }

  return outLines.join('\n');
}

/**
 * 카드 코드의 generated 프롬프트를 만든다.
 *
 * 처리 순서:
 *   1) {TODAY}/{YESTERDAY} 등 날짜 변수 치환
 *   2) {XXX_OUTPUT} 자리표시자 치환 (라인 단위)
 *   3) DEPS에 정의된 의존 카드 결과를 [XXX 결과] 블록으로 본문 끝에 부착
 *      (단, prompt 본문에 이미 자리표시자로 인용된 카드는 중복 부착하지 않음 — Step 3-A 결정)
 *
 * @param {string} code - 카드 코드
 * @param {Object} results - { 'P1A': '...결과 텍스트...', ... }
 * @param {Object} vars    - { today, yesterday }
 * @returns {string}
 */
export function buildGenerated(code, results = {}, vars = {}) {
  const card = CARD_BY_CODE[code];
  if (!card) return '';

  // (1) 날짜 변수
  let body = substituteVars(card.prompt, vars);

  // 본문 안에 등장한 자리표시자 카드 코드 수집 (중복 부착 방지용)
  const inlinePlaceholders = new Set();
  const phRe = /\{([A-Z0-9_-]+)_OUTPUT\}/g;
  let m;
  while ((m = phRe.exec(body)) !== null) {
    inlinePlaceholders.add(m[1]);
  }

  // (2) 자리표시자 치환
  body = substitutePlaceholders(body, results, code);

  // (3) DEPS 블록 부착 — 본문에 이미 자리표시자로 들어간 카드는 제외
  const deps = DEPS[code] || [];
  const blocks = [];
  for (const dep of deps) {
    if (inlinePlaceholders.has(dep)) continue; // 본문에서 이미 인용됨
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

  return blocks.length ? `${body}\n\n${blocks.join('\n\n')}` : body;
}

/**
 * 의존 카드 중 결과가 비어있는 것 목록 (LOCKED/MISSING 판정용).
 */
export function missingDeps(code, results = {}) {
  const deps = DEPS[code] || [];
  return deps.filter(d => {
    const c = CARD_BY_CODE[d];
    if (!c || !c.enabled) return false;
    return !(results[d] && results[d].trim());
  });
}
