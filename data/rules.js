// 운영 규칙 — 매뉴얼 v6 hj_launchpad_v6_manual.html:2175 이식
// R-01~R-10. 카드와 분리해 보관. UI는 별도 단계에서 (Step 5 또는 설정 화면).

export const ABS_RULES = [
  { type: 'danger', num: 'R-01', title: '매도금지 자산',
    body: 'A10(미래에셋 TDF2035)·A11(하나PIMCO글로벌인컴혼합)·A14(KBPIMCO글로벌인컴셀렉션)은 어떤 시장 상황에서도 매도 불가. 모든 분석에서 조정 대상 제외.' },
  { type: 'danger', num: 'R-02', title: 'D01/D02 가격갭 플래그',
    body: 'D01(XLE)·D02(ITA)는 KRX 가격갭 플래그 보유. 진입 전 반드시 실시간 괴리율 확인.' },
  { type: 'warn',   num: 'R-03', title: 'A15 현금 보호',
    body: 'A15는 DC 계좌 현금 예비금. 전체 포트 5% 이상 현금 비중 유지. 긴급 재진입용.' },
];

export const EXEC_RULES = [
  { type: 'warn',   num: 'R-04', title: 'T1 헬스체크 의무',
    body: '보유 포지션이 있는 날 T1 카드는 Critical Path에 포함. BROKEN 판정 시 당일 중 exit 계획 수립 필수.' },
  { type: 'warn',   num: 'R-05', title: '스윙↔단타 충돌 처리',
    body: '스윙 보유 중 동일 종목 단타 신호 → 스윙 사이즈 유지, 단타 진입 금지. 스윙 exit 후에만 단타 허용. 양방향 포지션 절대 금지.' },
  { type: 'warn',   num: 'R-06', title: '사이징 상한',
    body: '단일 종목 최대 15%. 동일 섹터 합산 최대 25%. 초동 신호 단계 5~8% 이하. 확신도 없는 추격매수 금지.' },
  { type: 'warn',   num: 'R-07', title: '최소 실행 의무',
    body: '30분 미만이어도 P1A + M0 + T1(보유시) 반드시 실행. 이 3개가 빠진 날 신규 진입 금지.' },
  { type: 'danger', num: 'R-08', title: '레짐 전환 경보',
    body: 'M0 레짐 전환 경보 🔴 HIGH 발동 시 — 당일 신규 진입 금지. 기존 포지션 절반 이하 축소 검토.' },
];

export const REVIEW_RULES = [
  { type: 'ok',   num: 'R-09', title: 'R1 복기 최소 기준',
    body: '주 3회 이상 실행. 예측 방향 적중률·사이즈 적절성·T1 판정 정확도 3개 KPI 기록.' },
  { type: 'info', num: 'R-10', title: '월간 파이프라인 리뷰',
    body: '매월 마지막 주 — Critical Path 재검토, 프롬프트 drift 여부 확인, 실제 수익률 vs AI 추천 방향 비교.' },
];

// ── Step 3-C: 절대성 표현 검증 룰 ──────────────────
// 방어선 카드(G1·C1·I2)에 한정해, 결과 paste 시 절대성 표현이 들어 있으면
// 노란 경고 박스로 안내. 저장 차단은 하지 않는다 — 사용자에게 한 번 더 검토 권장.
//
// 사용자 명세에 따라 REVIEW_RULES 배열에 속성으로 부착 (REVIEW_RULES.absoluteExpression).
REVIEW_RULES.absoluteExpression = {
  appliesTo: ['G1', 'C1', 'I2'],
  patterns: [
    '확실', '확실히', '확실하게',
    '100%', '100 퍼센트', '100퍼센트',
    '무조건',
    '반드시',
    '절대',
    '틀림없이', '틀림없는',
    '의심의 여지없',
    '확정적',
  ],
  severity: 'WARNING',
  message: '절대성 표현 감지',
};

/**
 * 텍스트에 절대성 표현이 들어 있는지 검사.
 *
 *   - 방어선 카드(G1·C1·I2)에 한정 (cardCode 검사)
 *   - 단순 substring 검사 (text.includes)
 *   - 중복 제거 후 발견된 패턴 배열 반환
 *
 * @param {string} text - 검사할 텍스트
 * @param {string} cardCode - 카드 코드
 * @returns {string[]} 발견된 패턴 (없으면 빈 배열)
 */
export function detectAbsoluteExpressions(text, cardCode) {
  if (!REVIEW_RULES.absoluteExpression.appliesTo.includes(cardCode)) return [];
  if (!text) return [];
  const found = [];
  for (const pattern of REVIEW_RULES.absoluteExpression.patterns) {
    if (text.includes(pattern)) found.push(pattern);
  }
  return [...new Set(found)];
}
