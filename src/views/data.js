// 자료관리 view — Step 1 placeholder
// Step 6에서 본격 구현: JSON Export/Import.

export function renderData(root) {
  root.innerHTML = `
    <div class="section-title">자료관리</div>
    <div class="placeholder">
      <strong>자료관리 (Step 6 예정)</strong>
      오늘 run JSON 백업/복원, 전체 데이터 백업/복원.
      <span class="hint">IndexedDB ↔ JSON 라운드트립</span>
    </div>
  `;
}
