// Hash 라우터 — Step 1 골격
// 라우트:
//   #/              → dashboard
//   #/card/:code    → card
//   #/import        → import
//   #/data          → data
//   #/settings      → settings

import { renderDashboard } from './views/dashboard.js';
import { renderCard }      from './views/card.js';
import { renderImport }    from './views/import.js';
import { renderData }      from './views/data.js';
import { renderSettings }  from './views/settings.js';

const routes = [
  { pattern: /^#\/?$/,                    name: 'dashboard', handler: renderDashboard },
  { pattern: /^#\/card\/([A-Za-z0-9-]+)/, name: 'card',      handler: renderCard, paramKeys: ['code'] },
  { pattern: /^#\/import\/?$/,            name: 'import',    handler: renderImport },
  { pattern: /^#\/data\/?$/,              name: 'data',      handler: renderData },
  { pattern: /^#\/settings\/?$/,          name: 'settings',  handler: renderSettings },
];

function parseHash(hash) {
  const h = hash || '#/';
  for (const r of routes) {
    const m = h.match(r.pattern);
    if (m) {
      const params = {};
      (r.paramKeys || []).forEach((k, i) => { params[k] = m[i + 1]; });
      return { name: r.name, handler: r.handler, params };
    }
  }
  return { name: 'dashboard', handler: renderDashboard, params: {} };
}

function updateActiveTab(routeName) {
  document.querySelectorAll('.tab-bar .tab').forEach(el => {
    el.classList.toggle('active', el.dataset.route === routeName);
  });
}

export function dispatch() {
  const root = document.getElementById('view-root');
  if (!root) return;
  const route = parseHash(location.hash);
  root.innerHTML = '';
  route.handler(root, route.params);
  updateActiveTab(route.name);
  window.scrollTo(0, 0);
}

export function initRouter() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}
