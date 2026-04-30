// 카드 의존성 그래프 — 매뉴얼 v6 hj_launchpad_v6_manual.html:684 이식
// 30카드 전체 보관 (visible/enabled에 관계없이 그래프는 완전).
// 런타임에서 카드의 enabled 플래그를 보고 평가하는 쪽이 책임진다 (src/prompt.js).

export const DEPS = {
  // ── 수집 (collect) ─────────────────────────
  'P1B': ['P1A'],
  'P2':  ['P1A', 'P1B'],
  'P3':  ['P2'],
  'D1':  ['P1A', 'P1B', 'M1'],
  'N0':  ['P1A', 'P1B', 'P2', 'P3', 'M1', 'M2', 'D1'],

  // ── 판단 (judge) ───────────────────────────
  'M0':  ['P1A', 'P1B', 'P2', 'P3'],
  'M1':  ['M0', 'P2', 'P3'],
  'M2':  ['M0', 'M1'],
  'M3':  ['M1', 'M2', 'D1', 'P2', 'P3'],
  'T1':  ['M0', 'M3', 'D1', 'P2', 'P3'],
  'AV':  ['M3', 'V1', 'P2', 'P3'],          // enabled=false (영구 제외) — 그래프엔 보관
  'V1':  ['M3', 'D1', 'P1B'],
  'P0':  ['M0', 'M3', 'V1'],
  'I2':  ['P1A', 'P1B', 'M0', 'M1', 'M2', 'D1', 'M3', 'P0'],
  'I3':  ['M1', 'M2', 'M3'],                // enabled=false
  // G1: 매뉴얼 v6 그대로 유지. R1 결과가 비어있으면 buildGenerated에서 자동 스킵.
  // AV는 enabled=false라 prompt.js에서 합성 시 제외됨.
  'G1':  ['P1A','P1B','P2','P3','M0','M1','M2','D1','M3','T1','AV','V1','P0','I2','N0','R1'],
  // C1: v0.1 결정 — R1 제거 (R1은 free-text 카드, cross-run 의존 미지원)
  'C1':  ['G1', 'T1', 'I2'],
  // R1: v0.1 결정 — 의존 없는 free-text 입력 카드. 매뉴얼의 ['C1','I2']는 cross-run을 의도했으나 v0.1에선 미지원.

  // ── 단타 (daytrade) ────────────────────────
  'DT-P1B': ['DT-P1A'],
  'DT-P2':  ['DT-P1A', 'DT-P1B'],
  'DT-P3':  ['DT-P1A', 'DT-P1B', 'DT-P2'],

  // ── 노마드 (nomad) ─────────────────────────
  'NOMAD-C': ['NOMAD-G'],

  // 독립 카드 (의존 없음):
  //   v0.1 17카드: P1A, R1
  //   옵션 카드:   L-SUP, L-EVT, Q1, S1, M0-전환, DT-P1A, NOMAD-G, X-SIGNAL
};
