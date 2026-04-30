// Card execution view — Step 3-B: 합성 프롬프트 미리보기 + 상태별 버튼 분기 + AI 사이트 새 탭
//
// 레이아웃:
//   A. 카드 헤더 (코드 + 제목 + 상태 배지) + 방어선 표시
//   B. 의존 카드 칩 + 누락 경고
//   C. 합성 프롬프트 미리보기 (<details>로 접힘)
//   D. 액션 버튼 영역 (상태별 분기)
//   E. 결과 입력 영역 (RUNNING 이상에서 표시)
//
// 절대 원칙 준수:
//   - AI 사이트는 window.open(url, '_blank', 'noopener,noreferrer')만. fetch/iframe 금지.
//   - 모든 상태 전이는 사용자 명시 클릭. setTimeout/setInterval 자동 진행 없음.
//   - 방어선 카드는 dep으로서 REVIEWED여야만 후속 unlock (state-machine.js에서 보장됨).

import { CARD_BY_CODE } from '../../data/cards.js';
import { DEPS }         from '../../data/deps.js';
import { STATUS, STATUS_META } from '../state-machine.js';
import * as store from '../store.js';
import { buildGenerated, missingDeps } from '../prompt.js';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStatusBadge(status) {
  const meta = STATUS_META[status] || STATUS_META.LOCKED;
  return `<span class="status-badge ${meta.cls}">
    <span class="status-icon">${meta.icon}</span><span class="status-text">${meta.label}</span>
  </span>`;
}

let _unsub = null;
let _draftPayload = '';   // 입력 중 텍스트 (리렌더 사이 보존)
let _draftCode = null;    // 그 텍스트가 어느 카드 것인지

export function renderCard(root, params) {
  if (_unsub) { _unsub(); _unsub = null; }

  const code = (params && params.code) || '';
  const card = CARD_BY_CODE[code];

  // 카드가 바뀌면 입력 draft 초기화
  if (_draftCode !== code) { _draftPayload = ''; _draftCode = code; }

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

    root.innerHTML = renderBody(card);
    bindHandlers(card);
    // 입력 중인 draft 복원 (리렌더 사이 textarea 값 유지)
    const taResult = document.getElementById('ta-result');
    if (taResult && _draftPayload && taResult.value !== _draftPayload) {
      taResult.value = _draftPayload;
    }
  };

  draw();
  _unsub = store.subscribe(draw);
}

// ── 본문 렌더 ────────────────────────────────────
function renderBody(card) {
  const status = store.getCardStatus(card.code) || STATUS.LOCKED;
  const result = store.getCardResult(card.code);
  const savedPayload = result ? result.payload : '';

  // 의존 카드
  const deps = (DEPS[card.code] || []).filter(d => {
    const c = CARD_BY_CODE[d];
    return c && c.enabled;
  });

  const depsLine = deps.length === 0
    ? '<div class="deps-line">의존 없음 — 독립 실행 카드</div>'
    : `<div class="deps-line">의존: ${deps.map(d => {
        const ds = store.getCardStatus(d) || STATUS.LOCKED;
        const meta = STATUS_META[ds];
        const dCard = CARD_BY_CODE[d];
        const isDef = dCard && dCard.defenseLine ? ' is-defense-dep' : '';
        return `<a class="dep-chip ${meta.cls}${isDef}" href="#/card/${encodeURIComponent(d)}" title="${meta.label}${dCard && dCard.defenseLine ? ' · 방어선 (REVIEWED 필요)' : ''}">${escapeHtml(d)} ${meta.icon}</a>`;
      }).join(' ')}</div>`;

  // 결과 맵 (모든 카드의 저장된 결과 수집)
  const results = {};
  for (const cs of store.getAllCardStates()) {
    const r = store.getCardResult(cs.cardCode);
    if (r) results[cs.cardCode] = r.payload;
  }

  // 합성 프롬프트
  const generated = buildGenerated(card.code, results, {});

  // 누락된 dep 결과 경고
  const missing = missingDeps(card.code, results);
  const missingWarn = missing.length > 0
    ? `<div class="prompt-missing-warn">⚠ 의존 결과 누락: ${missing.map(c => escapeHtml(c)).join(', ')}
        — 합성 프롬프트에 "(${missing[0]} 결과 없음)" 마커가 들어갑니다. 먼저 해당 카드를 저장하세요.</div>`
    : '';

  // 방어선 표시
  const defenseNotice = card.defenseLine
    ? `<div class="defense-notice">⚠ <strong>방어선 카드</strong> — ${escapeHtml(card.code)}는 HJ 투자 판단의 마지막 방어선.
        <strong>"검토 완료"</strong>를 눌러야만 후속 카드(예: ${describeDownstream(card.code)})가 unlock됩니다. SAVED 상태만으로는 부족.</div>`
    : '';

  // ai 사이트
  const ai = card.aiTarget || null;
  const aiLabel = ai ? `${ai.name}` : 'AI';
  const aiUrl   = ai ? ai.url      : '';

  return `
    <div class="section-title">카드 · ${escapeHtml(card.code)}</div>

    <div class="card-detail ${card.defenseLine ? 'is-defense' : ''}">
      <div class="cd-header">
        <div class="cd-code">${escapeHtml(card.code)}</div>
        <div class="cd-title">${escapeHtml(card.title)}</div>
        <div class="cd-status">${renderStatusBadge(status)}</div>
      </div>
      <div class="cd-desc">${escapeHtml(card.desc)}</div>
      ${depsLine}
      ${defenseNotice}

      ${renderPromptPreview(generated, missingWarn)}

      ${renderActions(status, ai, aiLabel, aiUrl)}

      ${renderResultArea(status, savedPayload)}

      <div class="cd-hint">${renderHintText(status, deps, missing)}</div>
    </div>

    <div class="toast-copy" id="toast-copy" aria-live="polite"></div>
  `;
}

function describeDownstream(code) {
  // 이 카드를 dep으로 가진 카드들 중 visible
  const out = [];
  for (const c in DEPS) {
    if ((DEPS[c] || []).includes(code)) {
      const dc = CARD_BY_CODE[c];
      if (dc && dc.visible) out.push(c);
    }
  }
  return out.length ? out.join(', ') : '(직접 참조 카드 없음)';
}

function renderPromptPreview(generated, missingWarn) {
  return `
    <details class="prompt-preview">
      <summary>합성 프롬프트 미리보기 <span class="ppv-hint">(클릭해서 펼치기)</span></summary>
      <div class="prompt-preview-body">
        ${missingWarn}
        <pre class="prompt-preview-box">${escapeHtml(generated)}</pre>
      </div>
    </details>
  `;
}

function renderActions(status, ai, aiLabel, aiUrl) {
  // 상태별 버튼 분기
  if (status === STATUS.LOCKED) {
    return `<div class="action-row locked-msg">
      🔒 의존 카드를 먼저 완료하세요. (방어선 dep은 "검토 완료"까지 필요)
    </div>`;
  }

  if (status === STATUS.READY) {
    return `<div class="action-row">
      <button class="btn-primary" id="btn-start">▶ 시작</button>
    </div>`;
  }

  if (status === STATUS.RUNNING) {
    const aiBtn = ai
      ? `<a class="btn-sec ai-target-link" id="btn-ai-open" href="${escapeHtml(aiUrl)}" target="_blank" rel="noopener noreferrer">↗ ${escapeHtml(aiLabel)}에서 열기</a>`
      : '';
    return `<div class="action-row">
      <button class="btn-primary" id="btn-copy">📋 프롬프트 복사</button>
      ${aiBtn}
      <button class="btn-sec" id="btn-rerun">↻ 재실행</button>
    </div>`;
  }

  if (status === STATUS.PASTED) {
    return `<div class="action-row">
      <button class="btn-primary" id="btn-save">💾 저장</button>
      <button class="btn-sec" id="btn-rerun">↻ 재실행</button>
    </div>`;
  }

  if (status === STATUS.SAVED || status === STATUS.WARNING) {
    return `<div class="action-row">
      <button class="btn-primary" id="btn-review">✓ 검토 완료</button>
      <button class="btn-sec" id="btn-rerun">↻ 재실행</button>
    </div>`;
  }

  if (status === STATUS.REVIEWED) {
    return `<div class="action-row">
      <span class="reviewed-mark">✓ 검토 완료됨</span>
      <button class="btn-sec" id="btn-rerun">↻ 재실행</button>
    </div>`;
  }

  if (status === STATUS.MISSING) {
    return `<div class="action-row">
      <button class="btn-primary" id="btn-save">💾 저장 (다시 시도)</button>
      <button class="btn-sec" id="btn-rerun">↻ 재실행</button>
    </div>`;
  }

  return '';
}

function renderResultArea(status, savedPayload) {
  // RUNNING 이상에서만 표시
  const showStates = [STATUS.RUNNING, STATUS.PASTED, STATUS.SAVED, STATUS.REVIEWED, STATUS.WARNING, STATUS.MISSING];
  if (!showStates.includes(status)) return '';

  const readonly = (status === STATUS.SAVED || status === STATUS.REVIEWED) ? '' : '';
  const initialValue = savedPayload || _draftPayload || '';
  const charCount = initialValue.length;

  return `
    <div class="cd-section">
      <div class="cd-section-label">
        결과 붙여넣기
        <span class="char-count" id="char-count">${charCount}자</span>
      </div>
      <textarea id="ta-result" class="ta-result"
                placeholder="${escapeHtml(getResultPlaceholder(status))}"
                ${readonly}>${escapeHtml(initialValue)}</textarea>
    </div>
  `;
}

function getResultPlaceholder(status) {
  if (status === STATUS.RUNNING) return 'AI에서 받은 결과를 여기에 붙여넣으세요. 입력 시 자동으로 PASTED 상태로 전이.';
  if (status === STATUS.PASTED)  return '내용 입력됨. [저장] 클릭하면 IndexedDB에 저장.';
  if (status === STATUS.SAVED)   return '저장된 결과. [재실행]으로 다시 실행 가능.';
  if (status === STATUS.REVIEWED) return '검토 완료된 결과.';
  if (status === STATUS.MISSING) return '저장 실패 — 내용 다시 확인.';
  return '';
}

function renderHintText(status, deps, missing) {
  if (status === STATUS.LOCKED) {
    const lockedDeps = deps.filter(d => {
      const ds = store.getCardStatus(d);
      return ds !== STATUS.SAVED && ds !== STATUS.REVIEWED;
    });
    return `의존 카드 [${lockedDeps.join(', ') || '?'}]가 충족되지 않음.`;
  }
  if (status === STATUS.READY)    return '준비됨. [시작] 버튼으로 진행.';
  if (status === STATUS.RUNNING)  return '[프롬프트 복사] → [AI에서 열기] → AI에서 실행 → 결과를 아래 textarea에 붙여넣기.';
  if (status === STATUS.PASTED)   return '결과 입력 확인. [저장]으로 IndexedDB 기록 + 의존 카드 unlock.';
  if (status === STATUS.SAVED)    return '저장 완료. 직접 검토 후 [검토 완료]. (방어선 카드는 검토 완료해야 후속 unlock)';
  if (status === STATUS.REVIEWED) return '검토까지 끝남. 필요하면 [재실행].';
  if (status === STATUS.MISSING)  return '저장 시 검증 실패. 내용 다시 확인 후 저장.';
  return '';
}

// ── 핸들러 ───────────────────────────────────────
function bindHandlers(card) {
  const taResult  = document.getElementById('ta-result');
  const btnCopy   = document.getElementById('btn-copy');
  const btnStart  = document.getElementById('btn-start');
  const btnSave   = document.getElementById('btn-save');
  const btnReview = document.getElementById('btn-review');
  const btnRerun  = document.getElementById('btn-rerun');
  const charCount = document.getElementById('char-count');
  // ai-target-link는 일반 a[target=_blank]라서 추가 핸들러 불필요 (window.open 효과 동일).

  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      // 합성 프롬프트 텍스트는 <pre> 안에 escape돼 있으니, 다시 buildGenerated 호출해 raw 문자열 사용.
      const results = {};
      for (const cs of store.getAllCardStates()) {
        const r = store.getCardResult(cs.cardCode);
        if (r) results[cs.cardCode] = r.payload;
      }
      const text = buildGenerated(card.code, results, {});
      try {
        await navigator.clipboard.writeText(text);
        showCopyToast('✓ 합성 프롬프트 복사됨');
      } catch (e) {
        // 폴백: 임시 textarea로 복사
        const tmp = document.createElement('textarea');
        tmp.value = text;
        tmp.style.position = 'fixed'; tmp.style.left = '-9999px';
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); showCopyToast('✓ 합성 프롬프트 복사됨'); }
        catch (e2) { showCopyToast('⚠ 복사 실패'); }
        document.body.removeChild(tmp);
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
      _draftPayload = ev.target.value;
      _draftCode = card.code;
      if (charCount) charCount.textContent = `${ev.target.value.length}자`;
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
        else { _draftPayload = ''; }
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
      const ok = confirm(`${card.code} 재실행?\n저장된 결과가 삭제되고 RUNNING으로 진입합니다. 의존 카드는 영향 없음.`);
      if (!ok) return;
      try {
        // 사용자 명세: 재실행 → cardState 'RUNNING' + results 삭제
        // store.actionRerun은 result 삭제 후 READY로 리셋 → 그 다음 actionStart로 RUNNING.
        // 두 호출 모두 사용자 명시 클릭의 연쇄(자동 진행 아님 — 단일 사용자 액션의 결과).
        await store.actionRerun(card.code);
        await store.actionStart(card.code);
        _draftPayload = '';
      } catch (e) { alert('재실행 실패: ' + e.message); }
    });
  }
}

function showCopyToast(msg) {
  const el = document.getElementById('toast-copy');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  // 1초 후 fade out
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.classList.remove('show'); }, 1200);
}
