// Dashboard view — Step 2: 카드 17장 + 8단계 상태 배지 + 새 run 시작 버튼

import { VISIBLE_CARDS } from '../../data/cards.js';
import { STATUS, STATUS_META } from '../state-machine.js';
import * as store from '../store.js';

const ENGINE_BADGE = {
  grok:   { cls: 'badge-grok',   label: 'GROK' },
  gpt:    { cls: 'badge-gpt',    label: 'GPT' },
  claude: { cls: 'badge-claude', label: 'CLAUDE' },
};

const GROUP_LABEL = {
  collect: '수집형 (Tasks 자동 수집)',
  judge:   '판단형 (사람이 직접 실행)',
};

const GROUP_ORDER = ['collect', 'judge'];

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

function renderRow(card) {
  const eng = ENGINE_BADGE[card.engine] || { cls: '', label: (card.engine || '').toUpperCase() };
  const defenseBadge = card.defenseLine
    ? `<span class="badge badge-defense">방어선</span>`
    : '';
  const defenseClass = card.defenseLine ? 'is-defense' : '';

  const status = store.getCardStatus(card.code) || STATUS.LOCKED;
  const isLocked = status === STATUS.LOCKED;
  const lockedClass = isLocked ? 'is-locked' : '';

  const href = isLocked ? '#/' : `#/card/${encodeURIComponent(card.code)}`;
  const lockGuard = isLocked
    ? `onclick="event.preventDefault(); event.stopPropagation();"`
    : '';

  return `
    <a class="card-row ${defenseClass} ${lockedClass}" href="${href}" ${lockGuard}>
      <span class="card-code">${escapeHtml(card.code)}</span>
      <div class="card-meta">
        <div class="card-title">${escapeHtml(card.title)}</div>
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
  const startedAt = new Date(run.startedAt);
  const ts = startedAt.toLocaleString('ko-KR', { hour12: false });

  // 진행률
  const states = store.getAllCardStates();
  const total = states.length;
  const saved = states.filter(s => s.status === STATUS.SAVED || s.status === STATUS.REVIEWED).length;
  const reviewed = states.filter(s => s.status === STATUS.REVIEWED).length;

  return `
    <div class="run-header">
      <div class="run-info">
        <div class="run-label">${escapeHtml(run.runId)}</div>
        <div class="run-hint">시작: ${ts} · 저장 ${saved}/${total} · 검토 ${reviewed}/${total}</div>
      </div>
    </div>
  `;
}

let _unsub = null;

export function renderDashboard(root) {
  // 이전 라우트의 구독 해제
  if (_unsub) { _unsub(); _unsub = null; }

  const draw = () => {
    const byGroup = {};
    for (const card of VISIBLE_CARDS) {
      const g = card.group || 'judge';
      (byGroup[g] = byGroup[g] || []).push(card);
    }

    const sections = GROUP_ORDER
      .filter(g => byGroup[g] && byGroup[g].length)
      .map(g => `
        <div class="group-header">
          ${escapeHtml(GROUP_LABEL[g] || g)}
          <span class="count">${byGroup[g].length}장</span>
        </div>
        <div class="card-list">
          ${byGroup[g].map(renderRow).join('')}
        </div>
      `).join('');

    root.innerHTML = `
      <div class="section-title">대시보드 · v0.1 Step 2</div>
      ${renderRunHeader()}
      ${sections}
    `;

    const startBtn = document.getElementById('btn-start-run');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        startBtn.textContent = '시작 중...';
        try {
          await store.startNewRun();
        } catch (e) {
          console.error(e);
          alert('run 시작 실패: ' + e.message);
        }
      });
    }
  };

  draw();
  _unsub = store.subscribe(draw);
}
