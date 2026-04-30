// Card execution view — Step 1 placeholder
// Step 3에서 본격 구현: generated 프롬프트 합성, 결과 붙여넣기, OK 검토, 다음 카드.

import { CARD_BY_CODE } from '../../data/cards.js';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderCard(root, params) {
  const code = (params && params.code) || '';
  const card = CARD_BY_CODE[code];

  if (!card) {
    root.innerHTML = `
      <div class="section-title">카드</div>
      <div class="placeholder">
        <strong>알 수 없는 카드</strong>
        지정한 코드 <code>${escapeHtml(code)}</code> 카드를 찾을 수 없다.
        <span class="hint">대시보드에서 카드 선택</span>
      </div>
    `;
    return;
  }

  if (!card.visible) {
    root.innerHTML = `
      <div class="section-title">카드 · ${escapeHtml(card.code)}</div>
      <div class="placeholder">
        <strong>${escapeHtml(card.title)}</strong>
        이 카드는 v0.1 범위에서 숨김 처리.
        <span class="hint">visible=false (enabled=${card.enabled})</span>
      </div>
    `;
    return;
  }

  const defenseNote = card.defenseLine
    ? `<div class="placeholder" style="border-color:rgba(239,68,68,0.4);color:#fca5a5">
         <strong>⚠ 방어선 카드 (${escapeHtml(card.code)})</strong>
         자동 진행 차단 UX는 Step 3에서 적용.
         "다음 카드" 버튼은 검토 체크박스 + 모달 확인 전까지 비활성.
       </div>`
    : '';

  root.innerHTML = `
    <div class="section-title">카드 · ${escapeHtml(card.code)}</div>
    <div class="placeholder">
      <strong>${escapeHtml(card.title)}</strong>
      ${escapeHtml(card.desc)}
      <span class="hint">엔진: ${escapeHtml(card.engine)} · 그룹: ${escapeHtml(card.group)}</span>
      <span class="hint">Step 3에서 실행 화면 본격 구현 예정</span>
    </div>
    ${defenseNote}
  `;
}
