// 자료관리 view — Step 6
//
// PART 1: JSON Export — 전체 IndexedDB 데이터 백업
// PART 2: JSON Import — 백업 파일 복원 (덮어쓰기)
// PART 3: 데이터 삭제 — 활성 run 종료 / 특정 run 삭제 / 전체 삭제
//
// 절대 원칙:
//   - 외부 서버 업로드 금지 (Blob → URL.createObjectURL 로컬 다운로드만)
//   - 자동 진행 금지 (모든 액션은 사용자 클릭)
//   - localStorage / sessionStorage 사용 금지

import * as db from '../db.js';
import * as store from '../store.js';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad(n) { return String(n).padStart(2, '0'); }
function tsForFilename(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

// ── 메인 렌더 ───────────────────────────────────
export async function renderData(root) {
  // 활성 run + 전체 runs 목록
  const activeRun = store.getActiveRun();
  const allRuns = await db.listRuns();

  root.innerHTML = `
    <div class="section-title">자료 관리</div>

    <section class="data-section">
      <h3 class="ds-title">현재 상태 백업</h3>
      <p class="ds-desc">IndexedDB의 runs / cardStates / results 전체를 JSON 파일로 다운로드합니다. 외부 서버로 업로드되지 않습니다.</p>
      <div class="ds-stats" id="ds-stats">로딩 중…</div>
      <button class="btn-primary" id="btn-export">⬇ JSON 다운로드</button>
    </section>

    <section class="data-section">
      <h3 class="ds-title">백업 복원</h3>
      <p class="ds-desc">JSON 백업 파일을 불러와 기존 데이터를 <strong>덮어씁니다</strong>. 복원 전 현재 데이터를 먼저 백업하세요.</p>
      <div class="restore-row">
        <input type="file" id="file-import" accept=".json,application/json">
        <button class="btn-sec" id="btn-import" disabled>↻ 복원하기</button>
      </div>
      <div id="import-status" class="import-status"></div>
    </section>

    <section class="data-section danger-section">
      <h3 class="ds-title">데이터 삭제</h3>

      <div class="ds-row">
        <div class="ds-row-label">활성 run 종료</div>
        <div class="ds-row-body">
          ${activeRun
            ? `<div class="ds-line"><code>${escapeHtml(activeRun.runId)}</code> 가 진행 중입니다.</div>
               <button class="btn-sec" id="btn-end-run">⏹ 활성 run 종료 (status=completed)</button>`
            : `<div class="ds-line muted">활성 run이 없습니다.</div>`}
        </div>
      </div>

      <div class="ds-row">
        <div class="ds-row-label">특정 run 삭제</div>
        <div class="ds-row-body">
          ${allRuns.length === 0
            ? '<div class="ds-line muted">저장된 run이 없습니다.</div>'
            : `<select id="sel-run">
                 ${allRuns.map(r => `<option value="${escapeHtml(r.runId)}">${escapeHtml(r.runId)} · ${escapeHtml(r.status)}</option>`).join('')}
               </select>
               <button class="btn-sec" id="btn-delete-run">🗑 선택한 run 삭제</button>`}
        </div>
      </div>

      <div class="ds-row danger-row">
        <div class="ds-row-label danger-label">전체 데이터 삭제</div>
        <div class="ds-row-body">
          <div class="ds-line">⚠ 모든 runs / cardStates / results 가 삭제됩니다. 되돌릴 수 없습니다.</div>
          <button class="btn-danger" id="btn-delete-all">⚠ 모든 데이터 삭제 (되돌릴 수 없음)</button>
        </div>
      </div>
    </section>

    <div class="data-hint">
      ※ 외부 서버 업로드 없음. 모든 처리는 브라우저 IndexedDB와 로컬 파일 시스템 안에서만 이루어집니다.
    </div>
  `;

  await refreshStats();
  bindHandlers();
}

async function refreshStats() {
  const el = document.getElementById('ds-stats');
  if (!el) return;
  try {
    const data = await db.exportAllData();
    el.innerHTML = `
      <span class="stat-chip">runs ${data.runs.length}</span>
      <span class="stat-chip">cardStates ${data.cardStates.length}</span>
      <span class="stat-chip">results ${data.results.length}</span>
    `;
  } catch (e) {
    el.textContent = '통계 로드 실패: ' + e.message;
  }
}

function bindHandlers() {
  const btnExport    = document.getElementById('btn-export');
  const fileImport   = document.getElementById('file-import');
  const btnImport    = document.getElementById('btn-import');
  const importStatus = document.getElementById('import-status');
  const btnEndRun    = document.getElementById('btn-end-run');
  const selRun       = document.getElementById('sel-run');
  const btnDeleteRun = document.getElementById('btn-delete-run');
  const btnDeleteAll = document.getElementById('btn-delete-all');

  if (btnExport) btnExport.addEventListener('click', handleExport);

  if (fileImport && btnImport) {
    fileImport.addEventListener('change', () => {
      btnImport.disabled = !fileImport.files || fileImport.files.length === 0;
      if (importStatus) importStatus.textContent = '';
    });
    btnImport.addEventListener('click', () => handleImport(fileImport, importStatus));
  }

  if (btnEndRun) btnEndRun.addEventListener('click', handleEndRun);
  if (btnDeleteRun && selRun) btnDeleteRun.addEventListener('click', () => handleDeleteRun(selRun.value));
  if (btnDeleteAll) btnDeleteAll.addEventListener('click', handleDeleteAll);
}

// ── PART 1: Export ───────────────────────────────
async function handleExport() {
  try {
    const data = await db.exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `hj-launchpad-backup-${tsForFilename()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // URL 해제는 약간의 딜레이 후 — 다운로드 시작이 보장된 뒤 (시간 기반 자동 진행 아님; 단순 cleanup)
    setTimeout(() => URL.revokeObjectURL(url), 200);
  } catch (e) {
    alert('내보내기 실패: ' + e.message);
  }
}

// ── PART 2: Import ───────────────────────────────
function validateImportSchema(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    errors.push('JSON 객체가 아닙니다.');
    return errors;
  }
  if (data.version !== 1) errors.push(`version === 1 이어야 합니다 (현재: ${data.version})`);
  if (!Array.isArray(data.runs))       errors.push('runs 배열이 없습니다.');
  if (!Array.isArray(data.cardStates)) errors.push('cardStates 배열이 없습니다.');
  if (!Array.isArray(data.results))    errors.push('results 배열이 없습니다.');

  if (errors.length === 0) {
    // 항목 필수 필드
    for (const r of data.runs) {
      if (!r.runId || typeof r.startedAt !== 'number') {
        errors.push(`runs 항목 필수 필드 누락: ${JSON.stringify(r).slice(0, 80)}`);
        break;
      }
    }
    for (const cs of data.cardStates) {
      if (!cs.id || !cs.runId || !cs.cardCode || !cs.status) {
        errors.push(`cardStates 항목 필수 필드 누락: ${JSON.stringify(cs).slice(0, 80)}`);
        break;
      }
    }
    for (const re of data.results) {
      if (!re.id || !re.runId || !re.cardCode) {
        errors.push(`results 항목 필수 필드 누락: ${JSON.stringify(re).slice(0, 80)}`);
        break;
      }
    }
  }

  return errors;
}

async function handleImport(fileInput, statusEl) {
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    if (statusEl) statusEl.textContent = '파일을 선택하세요.';
    return;
  }
  const file = fileInput.files[0];

  let text;
  try {
    text = await file.text();
  } catch (e) {
    alert('파일 읽기 실패: ' + e.message);
    return;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    alert('JSON 파싱 실패:\n' + e.message);
    return;
  }

  const errors = validateImportSchema(data);
  if (errors.length > 0) {
    alert('백업 파일 형식 오류:\n\n' + errors.join('\n'));
    return;
  }

  const ok = confirm(
    `기존 데이터가 모두 삭제되고 백업 데이터로 복원됩니다.\n\n` +
    `복원할 데이터:\n` +
    `  · runs: ${data.runs.length}\n` +
    `  · cardStates: ${data.cardStates.length}\n` +
    `  · results: ${data.results.length}\n` +
    `  · 백업 시점: ${data.exportedAt || '(미기록)'}\n\n` +
    `계속할까요?`
  );
  if (!ok) return;

  try {
    await db.importAllData(data);
    alert('복원이 완료되었습니다. 새로고침합니다.');
    location.reload();
  } catch (e) {
    alert('복원 실패: ' + e.message);
  }
}

// ── PART 3: 삭제 ────────────────────────────────
async function handleEndRun() {
  const run = store.getActiveRun();
  if (!run) return;
  const ok = confirm(
    `현재 활성 run을 종료하시겠습니까?\n\n` +
    `runId: ${run.runId}\n` +
    `· 데이터는 보존되며 status만 'completed'로 변경됩니다.\n` +
    `· 종료 후 [새 run 시작]으로 새 run을 만들 수 있습니다.`
  );
  if (!ok) return;
  try {
    const updated = { ...run, status: 'completed', endedAt: Date.now() };
    await db.updateRun(updated);
    // store 캐시 갱신
    await store.loadActiveRun();
    alert('활성 run이 종료되었습니다.');
    location.hash = '#/data';
    location.reload();
  } catch (e) {
    alert('run 종료 실패: ' + e.message);
  }
}

async function handleDeleteRun(runId) {
  if (!runId) return;
  const ok = confirm(
    `"${runId}" run을 삭제하시겠습니까?\n\n` +
    `· 해당 run의 cardStates와 results도 함께 삭제됩니다.\n` +
    `· 다른 run에는 영향 없습니다.\n` +
    `· 되돌릴 수 없습니다.`
  );
  if (!ok) return;
  try {
    await db.deleteRunCascade(runId);
    // 활성 run을 삭제했으면 store 갱신
    const active = store.getActiveRun();
    if (active && active.runId === runId) {
      await store.loadActiveRun(); // null로 리셋
    }
    alert('삭제 완료. 새로고침합니다.');
    location.reload();
  } catch (e) {
    alert('run 삭제 실패: ' + e.message);
  }
}

async function handleDeleteAll() {
  const ok1 = confirm('정말 모든 데이터를 삭제하시겠습니까?\n(runs / cardStates / results / settings 전부)');
  if (!ok1) return;

  const typed = prompt('확인을 위해 \'삭제\'라고 입력하세요:');
  if (typed !== '삭제') {
    if (typed !== null) alert('"삭제"를 정확히 입력해야 합니다. 작업 취소.');
    return;
  }

  try {
    await db.deleteEverything();
    alert('모든 데이터가 삭제되었습니다. 새로고침합니다.');
    location.reload();
  } catch (e) {
    alert('전체 삭제 실패: ' + e.message);
  }
}
