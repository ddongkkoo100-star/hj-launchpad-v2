// Card execution view — Step 2: 4버튼 + textarea + 상태 배지
// Step 3에서 generated 프롬프트 본격 표시 + 방어선 카드 자동진행 차단 UX 추가.

import { CARD_BY_CODE } from '../../data/cards.js';
import { DEPS }         from '../../data/deps.js';
import { STATUS, STATUS_META } from '../state-machine.js';
import * as store from '../store.js';
import { buildGenerated } from '../prompt.js';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderStatusBadge(status) {
  const meta = STATUS_META[status] || STATUS_META.LOCKED;
  return `<span class="status-badge ${meta.cls}">
    <span class="status-icon">${meta.icon}</span><span class="status-text">${meta.label}</span>
  </span>`;
}

let _unsub = null;

export function renderCard(root, params) {
  if (_unsub) { _unsub(); _unsub = null; }

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

  const draw = () => {
    const run = store.getActiveRun();
    if (!run) {
      root.innerHTML = `
        <div class="section-title">카드 · ${escapeHtml(card.code)}</div>
        <div class="placeholder">
          <strong>활성 run이 없다</strong>
          대시보드에서 "새 run 시작" 먼저.
          <a class="btn-primary" href="#/">대시보드로</a>
        </div>
      `;
      return;
    }

    const status = store.getCardStatus(card.code) || STATUS.LOCKED;
    const result = store.getCardResult(card.code);
    const savedPayload = result ? result.payload : '';

    const deps = (DEPS[card.code] || []).filter(d => {
      const c = CARD_BY_CODE[d];
      return c && c.enabled;
    });

    // dep 상태 표시
    const depsLine = deps.length === 0
      ? '<div class="deps-line">의존 없음 — 독립 실행 카드</div>'
      : `<div class="deps-line">의존 카드: ${deps.map(d => {
          const ds = store.getCardStatus(d) || STATUS.LOCKED;
          const meta = STATUS_META[ds];
          return `<span class="dep-chip ${meta.cls}" title="${meta.label}">${escapeHtml(d)} ${meta.icon}</span>`;
        }).join(' ')}</div>`;

    // generated 프롬프트 (의존 결과 합성)
    const results = {};
    for (const cs of store.getAllCardStates()) {
      const r = store.getCardResult(cs.cardCode);
      if (r) results[cs.cardCode] = r.payload;
    }
    const generated = buildGenerated(card.code, results, {});

    // 버튼 상태 결정
    const canStart  = (status === STATUS.READY);
    const canPaste  = (status === STATUS.RUNNING || status === STATUS.PASTED || status === STATUS.MISSING);
    const canSave   = (status === STATUS.PASTED || status === STATUS.RUNNING || status === STATUS.MISSING);
    const canReview = (status === STATUS.SAVED || status === STATUS.WARNING);
    const canRerun  = (status === STATUS.SAVED || status === STATUS.REVIEWED ||
                       status === STATUS.WARNING || status === STATUS.MISSING ||
                       status === STATUS.PASTED  || status === STATUS.RUNNING);

    const defenseNotice = card.defenseLine
      ? `<div class="defense-notice">⚠ <strong>방어선 카드</strong> — ${escapeHtml(card.code)}는 HJ 투자 판단의 마지막 방어선. 자동 진행 차단 UX는 Step 3에서 본격 적용.</div>`
      : '';

    root.innerHTML = `
      <div class="section-title">카드 · ${escapeHtml(card.code)}</div>

      <div class="card-detail">
        <div class="cd-header">
          <div class="cd-code">${escapeHtml(card.code)}</div>
          <div class="cd-title">${escapeHtml(card.title)}</div>
          <div class="cd-status">${renderStatusBadge(status)}</div>
        </div>
        <div class="cd-desc">${escapeHtml(card.desc)}</div>
        ${depsLine}
        ${defenseNotice}

        <div class="cd-section">
          <div class="cd-section-label">PROMPT (generated)</div>
          <textarea id="ta-generated" readonly class="ta-readonly">${escapeHtml(generated)}</textarea>
          <button class="btn-sec" id="btn-copy">📋 generated 복사</button>
        </div>

        <div class="cd-section">
          <div class="cd-section-label">결과 붙여넣기</div>
          <textarea id="ta-result" placeholder="AI 결과를 여기에 붙여넣고 [저장]"
                    ${(status === STATUS.LOCKED || status === STATUS.READY) ? 'disabled' : ''}>${escapeHtml(savedPayload)}</textarea>
        </div>

        <div class="cd-actions">
          <button class="btn-primary" id="btn-start"  ${canStart  ? '' : 'disabled'}>▶ 시작</button>
          <button class="btn-primary" id="btn-save"   ${canSave   ? '' : 'disabled'}>💾 저장</button>
          <button class="btn-sec"     id="btn-review" ${canReview ? '' : 'disabled'}>✓ 검토 완료</button>
          <button class="btn-sec"     id="btn-rerun"  ${canRerun  ? '' : 'disabled'}>↻ 재실행</button>
        </div>

        <div class="cd-hint">
          ${status === STATUS.LOCKED ? '의존 카드를 먼저 SAVED 또는 REVIEWED 상태로 만들어야 한다.' : ''}
          ${status === STATUS.READY ? '"시작" 버튼으로 RUNNING 상태로 진입.' : ''}
          ${status === STATUS.RUNNING ? '결과를 textarea에 붙여넣으면 자동으로 PASTED 상태로 전이.' : ''}
          ${status === STATUS.PASTED ? '"저장"을 눌러 IndexedDB에 저장하고 SAVED 상태로 전이.' : ''}
          ${status === STATUS.SAVED ? '의존 카드들이 자동으로 READY로 전이됨. 직접 검토 후 "검토 완료".' : ''}
          ${status === STATUS.REVIEWED ? '검토 완료. 필요하면 "재실행"으로 다시.' : ''}
          ${status === STATUS.MISSING ? '저장 시 검증 실패. 결과 다시 확인 후 저장.' : ''}
        </div>
      </div>
    `;

    bindHandlers(card);
  };

  draw();
  _unsub = store.subscribe(draw);
}

function bindHandlers(card) {
  const taResult = document.getElementById('ta-result');
  const btnCopy   = document.getElementById('btn-copy');
  const btnStart  = document.getElementById('btn-start');
  const btnSave   = document.getElementById('btn-save');
  const btnReview = document.getElementById('btn-review');
  const btnRerun  = document.getElementById('btn-rerun');

  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const ta = document.getElementById('ta-generated');
      try {
        await navigator.clipboard.writeText(ta.value);
        btnCopy.textContent = '✓ 복사됨';
        setTimeout(() => { btnCopy.textContent = '📋 generated 복사'; }, 1200);
      } catch (e) {
        ta.select(); document.execCommand('copy');
        btnCopy.textContent = '✓ 복사됨';
        setTimeout(() => { btnCopy.textContent = '📋 generated 복사'; }, 1200);
      }
    });
  }

  if (btnStart) {
    btnStart.addEventListener('click', async () => {
      try { await store.actionStart(card.code); }
      catch (e) { alert('시작 실패: ' + e.message); }
    });
  }

  if (taResult) {
    taResult.addEventListener('input', async (ev) => {
      try { await store.actionPaste(card.code, ev.target.value); }
      catch (e) { console.error(e); }
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const payload = taResult ? taResult.value : '';
      try {
        const r = await store.actionSave(card.code, payload);
        if (!r.ok) alert('저장 실패: ' + r.reason);
      } catch (e) { alert('저장 실패: ' + e.message); }
    });
  }

  if (btnReview) {
    btnReview.addEventListener('click', async () => {
      try { await store.actionReview(card.code); }
      catch (e) { alert('검토 실패: ' + e.message); }
    });
  }

  if (btnRerun) {
    btnRerun.addEventListener('click', async () => {
      if (!confirm(`${card.code} 재실행?\n저장된 결과가 삭제되고 READY로 리셋된다. 의존 카드는 영향 없음.`)) return;
      try { await store.actionRerun(card.code); }
      catch (e) { alert('재실행 실패: ' + e.message); }
    });
  }
}
