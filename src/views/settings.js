// 설정 view — Step 6
//
// 항목:
//   1. 글자 크기 (small / normal / large) — IndexedDB settings store에 저장 (DB v2)
//   2. 테마 정보 (다크 테마 고정, Galaxy + Chrome 단일 타겟)
//   3. 앱 정보 (버전, GitHub, 캐시 초기화 가이드)
//
// 절대 원칙:
//   - localStorage 사용 금지 → IndexedDB settings store 사용

import * as db from '../db.js';

const FONT_SCALES = [
  { key: 'small',  label: '작게',  cls: 'font-small'  },
  { key: 'normal', label: '보통',  cls: 'font-normal' },
  { key: 'large',  label: '크게',  cls: 'font-large'  },
];

const FONT_CLASSES = FONT_SCALES.map(s => s.cls);

/** 페이지 진입 시 또는 설정 변경 후 body에 글자 크기 클래스 적용 */
export function applyFontScale(scale) {
  const body = document.body;
  for (const cls of FONT_CLASSES) body.classList.remove(cls);
  const found = FONT_SCALES.find(s => s.key === scale);
  body.classList.add(found ? found.cls : 'font-normal');
}

/** 앱 시작 시 설정 로드 + 적용 (app.js에서 호출) */
export async function loadAndApplySettings() {
  try {
    const scale = await db.getSetting('fontScale');
    applyFontScale(scale || 'normal');
  } catch (e) {
    console.warn('[settings] load failed', e);
    applyFontScale('normal');
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function renderSettings(root) {
  const currentScale = (await db.getSetting('fontScale')) || 'normal';

  root.innerHTML = `
    <div class="section-title">설정</div>

    <section class="data-section">
      <h3 class="ds-title">글자 크기</h3>
      <p class="ds-desc">화면 전체의 기본 글자 크기를 조정합니다. 즉시 적용되며 다음에 다시 열어도 유지됩니다.</p>
      <div class="font-scale-options" role="radiogroup" aria-label="글자 크기">
        ${FONT_SCALES.map(s => `
          <label class="fs-opt ${currentScale === s.key ? 'active' : ''}">
            <input type="radio" name="fontScale" value="${escapeHtml(s.key)}"
                   ${currentScale === s.key ? 'checked' : ''}>
            <span class="fs-label">${escapeHtml(s.label)}</span>
            <span class="fs-sample fs-sample-${escapeHtml(s.key)}">샘플</span>
          </label>
        `).join('')}
      </div>
    </section>

    <section class="data-section">
      <h3 class="ds-title">테마 정보</h3>
      <div class="info-grid">
        <div class="info-row"><span class="info-k">테마</span><span class="info-v">다크 (고정)</span></div>
        <div class="info-row"><span class="info-k">타겟 환경</span><span class="info-v">Galaxy + Chrome 단일 타겟</span></div>
        <div class="info-row"><span class="info-k">데이터</span><span class="info-v">IndexedDB <code>${escapeHtml(db.DB_INFO.name)}</code> v${db.DB_INFO.version}</span></div>
      </div>
    </section>

    <section class="data-section">
      <h3 class="ds-title">앱 정보</h3>
      <div class="info-grid">
        <div class="info-row"><span class="info-k">버전</span><span class="info-v">v0.1 (Step 6)</span></div>
        <div class="info-row"><span class="info-k">저장소</span><span class="info-v"><a href="https://github.com/ddongkkoo100-star/hj-launchpad-v2" target="_blank" rel="noopener noreferrer">GitHub ↗</a></span></div>
      </div>
    </section>

    <section class="data-section">
      <h3 class="ds-title">캐시 초기화 (문제 해결)</h3>
      <p class="ds-desc">코드 변경 후에도 옛 화면이 보이거나 PWA가 이상하게 동작하면 다음 절차로 캐시를 초기화하세요.</p>
      <ol class="cache-guide">
        <li>Chrome DevTools 열기 (F12)</li>
        <li>Application 탭 → 좌측 <strong>Service Workers</strong></li>
        <li>현재 등록된 SW 옆 <strong>Unregister</strong> 클릭</li>
        <li>좌측 <strong>Storage</strong> → <strong>Clear site data</strong> 클릭</li>
        <li>페이지 새로고침 (Ctrl+Shift+R)</li>
      </ol>
      <p class="ds-desc-small">⚠ "Clear site data"는 IndexedDB도 함께 지웁니다. 중요한 데이터는 먼저 자료관리에서 백업하세요.</p>
    </section>
  `;

  bindFontScaleHandlers();
}

function bindFontScaleHandlers() {
  const radios = document.querySelectorAll('input[name="fontScale"]');
  radios.forEach(r => {
    r.addEventListener('change', async (ev) => {
      const next = ev.target.value;
      try {
        await db.setSetting('fontScale', next);
        applyFontScale(next);
        // 시각적 active 클래스 갱신
        document.querySelectorAll('.fs-opt').forEach(el => {
          el.classList.toggle('active',
            el.querySelector('input[name="fontScale"]').value === next);
        });
      } catch (e) {
        alert('설정 저장 실패: ' + e.message);
      }
    });
  });
}
