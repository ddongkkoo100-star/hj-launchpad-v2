// Dashboard view — Step 1: visible 카드를 그룹별로 단순 리스트 출력
// 진행률/도착 상태/누락 경고는 Step 5에서 추가.

import { VISIBLE_CARDS } from '../../data/cards.js';

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

function renderRow(card) {
  const eng = ENGINE_BADGE[card.engine] || { cls: '', label: (card.engine || '').toUpperCase() };
  const defenseBadge = card.defenseLine
    ? `<span class="badge badge-defense">방어선</span>`
    : '';
  const defenseClass = card.defenseLine ? 'is-defense' : '';
  return `
    <a class="card-row ${defenseClass}" href="#/card/${encodeURIComponent(card.code)}">
      <span class="card-code">${escapeHtml(card.code)}</span>
      <div class="card-meta">
        <div class="card-title">${escapeHtml(card.title)}</div>
        <div class="card-desc">${escapeHtml(card.desc)}</div>
      </div>
      <div class="card-badges">
        ${defenseBadge}
        <span class="badge ${eng.cls}">${escapeHtml(eng.label)}</span>
      </div>
    </a>
  `;
}

export function renderDashboard(root) {
  const total = VISIBLE_CARDS.length;
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
    <div class="section-title">대시보드 · v0.1 Step 1</div>
    ${sections}
    <div class="debug-note">
      <strong>Step 1 점검</strong><br>
      visible 카드: <strong>${total}</strong>장 (목표 17장)<br>
      방어선: <strong>G1·C1·I2</strong> 빨간 좌측 보더<br>
      라우트: <code>#/</code>, <code>#/card/P1A</code>, <code>#/import</code>, <code>#/data</code>, <code>#/settings</code><br>
      진행률·상태 머신·Tasks 도착 상태는 Step 2~5에서 붙는다.
    </div>
  `;
}
