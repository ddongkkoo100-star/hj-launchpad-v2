// Dashboard view — Step 5: 진행률 + 그룹 분리 + 다음 할 카드 강조
//
// 그룹 정의 (사용자 명세):
//   - collect (수집형 6장): P1A, P1B, P2, P3, D1, N0
//   - judge   (판단형 8장): M0, M1, M2, M3, T1, V1, P0, R1
//   - defense (방어선 3장): G1, C1, I2
//
// data/cards.js의 group 필드는 collect/judge 두 종류뿐(G1·C1·I2도 judge)이므로,
// 이 화면에서만 defenseLine 플래그로 별도 그룹을 만든다 (cards.js 수정 금지).

import { VISIBLE_CARDS } from '../../data/cards.js';
import { STATUS, STATUS_META } from '../state-machine.js';
import * as store from '../store.js';

const ENGINE_BADGE = {
  grok:   { cls: 'badge-grok',   label: 'GROK' },
  gpt:    { cls: 'badge-gpt',    label: 'GPT' },
  claude: { cls: 'badge-claude', label: 'CLAUDE' },
};

// 그룹 정의 — dashboard 전용 (cards.js 미수정)
const GROUPS = [
  { key: 'collect', label: '수집형',   sub: 'Tasks 자동 수집',          accent: 'grok'    },
  { key: 'judge',   label: '판단형',   sub: '사람이 직접 실행',         accent: 'accent'  },
  { key: 'defense', label: '방어선',   sub: '사용자 검토 필수',         accent: 'red'     },
];

function classifyGroup(card) {
  if (card.defenseLine === true) return 'defense';
  if (card.group === 'collect')  return 'collect';
  return 'judge';
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStatusBadge(status) {
  const meta = STATUS_META[status] || STATUS_META.LOCKED;
  return `<span class="status-badge ${meta.cls}" title="${meta.label}">
    <span class="status-icon">${meta.icon}</span><span class="status-text">${meta.label}</span>
  </span>`;
}

// ── 진행률 계산 ─────────────────────────────────
function progressFor(cards) {
  const total = cards.length;
  let done = 0;
  let reviewed = 0;
  let ready = 0;
  let active = 0; // RUNNING/PASTED/MISSING/WARNING — 진행 중
  for (const c of cards) {
    const s = store.getCardStatus(c.code) || STATUS.LOCKED;
    if (s === STATUS.SAVED || s === STATUS.REVIEWED) done++;
    if (s === STATUS.REVIEWED) reviewed++;
    if (s === STATUS.READY) ready++;
    if (s === STATUS.RUNNING || s === STATUS.PASTED ||
        s === STATUS.MISSING || s === STATUS.WARNING) active++;
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, reviewed, ready, active, pct };
}

// ── 카드 row ────────────────────────────────────
function renderRow(card) {
  const eng = ENGINE_BADGE[card.engine] || { cls: '', label: (card.engine || '').toUpperCase() };
  const defenseBadge = card.defenseLine
    ? `<span class="badge badge-defense">방어선</span>`
    : '';

  const status = store.getCardStatus(card.code) || STATUS.LOCKED;
  const isLocked = status === STATUS.LOCKED;
  const isReady  = status === STATUS.READY;
  const isDone   = (status === STATUS.SAVED || status === STATUS.REVIEWED);

  const classes = [
    'card-row',
    card.defenseLine ? 'is-defense' : '',
    isLocked ? 'is-locked' : '',
    isReady  ? 'is-next' : '',
    isDone   ? 'is-done' : '',
  ].filter(Boolean).join(' ');

  const href = isLocked ? '#/' : `#/card/${encodeURIComponent(card.code)}`;
  const lockGuard = isLocked
    ? `onclick="event.preventDefault(); event.stopPropagation();"`
    : '';

  // 다음 할 카드 미니 라벨
  const nextHint = isReady
    ? `<span class="next-hint" aria-label="진입 가능">▶ 진입 가능</span>`
    : '';

  return `
    <a class="${classes}" href="${href}" ${lockGuard} aria-disabled="${isLocked}">
      <span class="card-code">${escapeHtml(card.code)}</span>
      <div class="card-meta">
        <div class="card-title-row">
          <span class="card-title">${escapeHtml(card.title)}</span>
          ${nextHint}
        </div>
        <div class="card-desc">${escapeHtml(card.desc)}</div>
        <div class="card-status-line">${renderStatusBadge(status)}</div>
      </div>
      <div class="card-badges">
        ${defenseBadge}
        <span class="badge ${eng.cls}">${escapeHtml(eng.label)}</span>
      </div>
    </a>
  `;
}

// ── 전체 진행률 영역 ────────────────────────────
function renderProgressBlock(allCards, byGroup) {
  const overall = progressFor(allCards);

  // 그룹 미니 카운터
  const miniRows = GROUPS.map(g => {
    const cards = byGroup[g.key] || [];
    const p = progressFor(cards);
    const fill = p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
    return `
      <div class="mini-progress mini-${g.key}">
        <div class="mini-head">
          <span class="mini-label">${escapeHtml(g.label)}</span>
          <span class="mini-count">${p.done}/${p.total}</span>
        </div>
        <div class="mini-bar"><div class="mini-bar-fill" style="width:${fill}%"></div></div>
      </div>
    `;
  }).join('');

  return `
    <div class="progress-block">
      <div class="progress-overall">
        <div class="po-head">
          <span class="po-label">오늘 진행률</span>
          <span class="po-count">${overall.done}<span class="po-sep">/</span>${overall.total}</span>
        </div>
        <div class="po-bar" role="progressbar"
             aria-valuenow="${overall.done}" aria-valuemin="0" aria-valuemax="${overall.total}">
          <div class="po-bar-fill" style="width:${overall.pct}%"></div>
        </div>
        <div class="po-meta">
          <span>검토 완료 ${overall.reviewed}</span>
          <span>·</span>
          <span>진행 가능 ${overall.ready}</span>
          ${overall.active > 0 ? `<span>·</span><span>진행 중 ${overall.active}</span>` : ''}
        </div>
      </div>
      <div class="progress-mini-group">
        ${miniRows}
      </div>
    </div>
  `;
}

// ── run 헤더 ────────────────────────────────────
function renderRunHeader() {
  const run = store.getActiveRun();
  if (!run) {
    return `
      <div class="run-header no-run">
        <div class="run-info">
          <div class="run-label">활성 run 없음</div>
          <div class="run-hint">새 run을 시작해 17카드를 진행하세요.</div>
        </div>
        <button class="btn-primary" id="btn-start-run">▶ 새 run 시작</button>
      </div>
    `;
  }
  const ts = new Date(run.startedAt).toLocaleString('ko-KR', { hour12: false });
  return `
    <div class="run-header compact">
      <div class="run-info">
        <div class="run-label">${escapeHtml(run.runId)}</div>
        <div class="run-hint">시작 ${ts}</div>
      </div>
    </div>
  `;
}

// ── 그룹 섹션 ───────────────────────────────────
function renderGroupSection(groupKey, cards) {
  const meta = GROUPS.find(g => g.key === groupKey);
  if (!meta || cards.length === 0) return '';
  const p = progressFor(cards);
  return `
    <section class="group-section group-${groupKey}">
      <header class="group-header-v2">
        <div class="gh-title">
          <span class="gh-label">${escapeHtml(meta.label)}</span>
          <span class="gh-sub">${escapeHtml(meta.sub)}</span>
        </div>
        <div class="gh-count">
          <span class="gh-count-num">${p.done}/${p.total}</span>
        </div>
      </header>
      <div class="card-list">
        ${cards.map(renderRow).join('')}
      </div>
    </section>
  `;
}

// ── 메인 ────────────────────────────────────────
let _unsub = null;

export function renderDashboard(root) {
  if (_unsub) { _unsub(); _unsub = null; }

  const draw = () => {
    const run = store.getActiveRun();

    // 그룹별 카드 분류
    const byGroup = { collect: [], judge: [], defense: [] };
    for (const card of VISIBLE_CARDS) {
      const k = classifyGroup(card);
      byGroup[k].push(card);
    }

    const headerHTML = renderRunHeader();
    const progressHTML = run ? renderProgressBlock(VISIBLE_CARDS, byGroup) : '';
    const groupsHTML = run
      ? GROUPS.map(g => renderGroupSection(g.key, byGroup[g.key])).join('')
      : '';

    root.innerHTML = `
      <div class="section-title">대시보드</div>
      ${headerHTML}
      ${progressHTML}
      ${groupsHTML}
    `;

    const startBtn = document.getElementById('btn-start-run');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        startBtn.textContent = '시작 중...';
        try { await store.startNewRun(); }
        catch (e) {
          console.error(e);
          alert('run 시작 실패: ' + e.message);
          startBtn.disabled = false;
          startBtn.textContent = '▶ 새 run 시작';
        }
      });
    }
  };

  draw();
  _unsub = store.subscribe(draw);
}
