// HJ 런치패드 v0.1 — 카드 데이터
// 매뉴얼 v6 hj_launchpad_v6_manual.html 에서 30카드 메타데이터 이식.
// Phase 1-A: visible=true 17카드의 prompt 본문 이식 (이 파일).
// Phase 1-B: visible=false 13카드의 prompt 본문 이식 (다음 단계).
//
// ── 플래그 의미 ──────────────────────────────
//   visible       : false면 모든 UI에서 숨김 (옵션·미사용 카드)
//   enabled       : false면 v0.1 명세상 영구 제외 (AV, I3) — DEPS 그래프에선 보관되지만 합성 시 스킵
//   defenseLine   : true면 G1·C1·I2 → 자동진행 차단 UX 적용
//   isTasksTarget : true면 Grok Tasks 자동 실행 대상 (수집 6개)
//   tasksGroup    : 속한 Tasks 실행 그룹 (없으면 null)
//   group         : 'collect' | 'judge' | 'daytrade' | 'nomad' | 'optional'

export const CARDS = [

  // ═══════════════════════════════════════════════════════════════════════
  // 수집 (collect) — Tasks 자동 실행 대상 6장
  // ═══════════════════════════════════════════════════════════════════════

  {
    code: 'P1A', engine: 'grok', tags: ['core'], group: 'collect',
    title: 'P1A — 매크로 헤드라인 v6',
    desc: 'Bloomberg/Reuters/WSJ + X 매크로 인플루언서. 출처 4단 강제.',
    keywords: '매크로 헤드라인 출처',
    dep: '',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'COLLECT-1',
    aiTarget: { name: 'GROK', url: 'https://grok.com' },
    prompt: `GROK — P1A 매크로 헤드라인 v6
오늘: {TODAY}
기준 시점: 한국 시간 06:00~09:00 사이 출력

당신은 시니어 매크로 리서처.
미국 장 마감 + 아시아 개장 사이의 매크로 헤드라인을 1차 출처에서 수집한다.
모든 수치에 출처 4단(기관/URL/시점/단위확인) 표기 강제.

──────────────────────────────────────
[수집 대상 — 1차 출처 우선]
──────────────────────────────────────
A. 통신사·신문: Bloomberg, Reuters, WSJ, FT
B. 공식 기관: Federal Reserve(federalreserve.gov), BEA(bea.gov), BLS(bls.gov), Cboe, ECB, BOJ, 한국은행, KRX, DART
C. X 매크로 인플루언서:
   - @zerohedge, @LizAnnSonders, @SoberLook, @Schuldensuehner
   - @michaelxbatnick, @WallStEarnings, @charliebilello
   - 검색식: from:zerohedge since:{YESTERDAY} min_faves:500
D. 장 마감/개장 데이터: NYSE/NASDAQ 종가, 시간외, KRX 시간외 단일가

──────────────────────────────────────
[출처 4단 표기 강제]
──────────────────────────────────────
모든 수치는 다음 4가지 동시 표기:
[수치] (기관명 / URL 또는 출처명 / 발표시점 / 단위확인)

예: 미국 3월 CPI 3.5% YoY (BLS / bls.gov/cpi / 2026-04-10 / % YoY 원문 확인)
예: VVIX 92.3 (Cboe / cboe.com/vix / 2026-04-26 종가 / 절대값 확인)

4개 중 하나라도 빠지면 → "(미확인)" 라벨 자동 부착, VERIFIED 도장 금지.

──────────────────────────────────────
[발표 일정 라벨 강제]
──────────────────────────────────────
- [확정 MM-DD]: 이미 발표된 것
- [예정 MM-DD]: 발표 예정. 컨센서스/추정치 명기
- [추정/Nowcast]: 공식 발표 전 시장 추정. 추정치 출처 명기

⚠ 발표 전 지표를 "확정"으로 쓰면 SEVERE ERROR.

──────────────────────────────────────
[기관 매칭 강제]
──────────────────────────────────────
- PCE → BEA (BLS 아님)
- CPI → BLS (BEA 아님)
- GDP → BEA
- VIX·VVIX → Cboe (Bloomberg 인용 가능하나 1차는 Cboe)
- 한국 외환보유액·수출 → 한국은행/관세청 구분
- 기관 잘못 매칭 시 자동 강등.

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 매크로 헤드라인 TOP10
| 순위 | 헤드라인 | 출처 4단 | 시장 영향 (중/저) |

표B. 핵심 수치 — 출처 4단 강제
| 지표 | 값 | 발표일 | 컨센서스 vs 실제 | 출처 (기관/URL/시점/단위) | 라벨 |

표C. 발표 예정 지표 (오늘~3일)
| KST 시간 | 지표 | 컨센서스 | 이전값 | 라벨 |

표D. 채권·환·원자재 흐름
| 자산 | 종가 | 일변 | 출처 4단 | 추세 해석 |
- TLT/IEF, USD index, WTI, 금, 비트코인

표E. X 매크로 인플루언서 핵심 게시 TOP5
| 핸들 | 게시 요약 | 좋아요/리포스트 | 시점 | 시장 시사점 |

표F. 미확인 항목 로그
출처 4단 미충족된 항목 모두 별도 로그. (미확인) 처리.

──────────────────────────────────────
[필수 준수 사항]
──────────────────────────────────────
1. 1차 출처 우선. 2차/3차 매체는 보조로만.
2. 자체 학습 데이터 추측 금지. 검색 안 되면 "(검색실패)" 명기.
3. 단위 표기: 조원 / 억원 / billion USD / million USD 명확히.
4. 발표일은 KST 또는 UTC 명시.
5. X 인플루언서 게시는 좋아요 임계값 적용 (글로벌 min_faves:500)

마지막 한 줄: "오늘 매크로 최대 변수 1개"`,
  },

  {
    code: 'P1B', engine: 'grok', tags: ['core'], group: 'collect',
    title: 'P1B — 섹터/모멘텀 v6',
    desc: '한국·미국 섹터 등락, 종목 모멘텀. KRX/네이버페이/Yahoo 명시.',
    keywords: '섹터 모멘텀 종목',
    dep: 'P1A 결과 필수',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'COLLECT-1',
    aiTarget: { name: 'GROK', url: 'https://grok.com' },
    prompt: `GROK — P1B 섹터/모멘텀 v6
오늘: {TODAY}
기준 시점: P1A 직후

당신은 시니어 섹터 분석가.
한국·미국 섹터별 등락과 핵심 종목 모멘텀을 1차 데이터 사이트에서 수집.
P1A의 매크로 흐름을 섹터·종목 레벨에서 검증·확장.

──────────────────────────────────────
[수집 대상 — 1차 데이터 사이트 명시]
──────────────────────────────────────
A. 한국:
   - KRX (krx.co.kr) — 업종별 등락률, 시간외 단일가
   - DART (dart.fss.or.kr) — 어제 공시
   - 네이버페이 증권 (finance.naver.com) — 시간외, 외국인/기관 수급
   - 한국경제 / 이데일리 / 매일경제 — 한국 헤드라인
B. 미국:
   - CNBC, Yahoo Finance — 섹터 ETF, afterhours
   - Finviz — 섹터 히트맵
   - Bloomberg, MarketWatch
C. ETF:
   - SPDR 섹터 ETF (XLF, XLK, XLE, XLV, XLI, XLY, XLP, XLU, XLB, XLRE, XLC)
   - 한국: KODEX 섹터 ETF, ARIRANG, TIGER

──────────────────────────────────────
[출처 4단 표기 강제 — P1A와 동일]
──────────────────────────────────────

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 미국 섹터 TOP3 + 워스트3 (전일 종가 기준)
| 섹터 | ETF | 등락률 | 출처 4단 | 핵심 종목 | 추세 |

표B. 한국 섹터 TOP3 + 워스트3 (어제 KRX 종가)
| 섹터 | 등락률 | 핵심 종목 | 출처 (KRX URL) | 외국인/기관 수급 |

표C. 미국 시간외 +5% 이상 / -5% 이하 종목
| 종목 | AH 등락 | 거래량 | 트리거 (실적/뉴스) | 출처 4단 |

표D. 한국 시간외 단일가 급등/급락
| 종목 | 시간외 등락 | 거래량 | 추정 트리거 | 출처 (네이버페이 URL) |

표E. 어제 공시 핵심 (DART 기준)
| 종목 | 공시 종류 | 핵심 내용 | 출처 (DART URL) | 시장 영향 |
- 자사주 매입/소각, 실적 공시, 유증/감자, 합병/분할

표F. 한국 외국인/기관 수급 (KRX 기준)
| 구분 | 어제 매매 | 누적 (1주/1개월) | 핵심 매수 종목 |

표G. 미국 ETF 자금 흐름 (전일)
| ETF | 자금 흐름 | 출처 (etf.com 또는 Yahoo) |

표H. 미↔한 섹터 매칭
| 미국 섹터 강세 | 1차 한국 매칭 | 2차 한국 매칭 |
※ 섹터 확산 추정. 직접 수치는 출력 금지.

──────────────────────────────────────
[필수 준수 사항]
──────────────────────────────────────
1. KRX 데이터는 오늘 오전 06:00 이전 스냅샷 명기
2. 한국 시간외 단일가는 네이버페이 06:00 스냅샷
3. 미국 afterhours는 미국 동부시간 종료 후 4시간 이내 스냅샷
4. 실적 수치는 단위(조/억/M$) 원문과 대조 후 표기. 단위 불확실 시 "(단위미확인)"
5. 목표주가 변경은 발표 증권사 명시. "다수 증권사" 표현 금지
6. 추측 금지. 공시 내용을 임의 해석/연결 금지.

마지막 한 줄: "오늘 섹터/종목 최대 모멘텀 1개"`,
  },

  {
    code: 'P2', engine: 'grok', tags: ['core'], group: 'collect',
    title: 'P2 — 커뮤니티 스캐너 v6 [부활]',
    desc: '팸코/레딧/디시/네이버/인포스탁 + X. 카운팅·감성·과열도 정량화.',
    keywords: '커뮤니티 5사이트 X 카운팅',
    dep: 'P1A·P1B 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'COLLECT-2',
    aiTarget: { name: 'GROK', url: 'https://grok.com' },
    prompt: `GROK — P2 커뮤니티 스캐너 v6
오늘: {TODAY}
기준 시점: P1A·P1B 이후

당신은 시니어 소셜 인텔리전스 분석가.
주식 커뮤니티 5개 + X에서 오늘 가장 활발히 언급되는 종목·테마·루머를
계량적으로 수집·카운팅한다. 감성·과열도 측정 포함.

──────────────────────────────────────
[수집 대상 — 5개 사이트 + X]
──────────────────────────────────────
A. 팸코 (PMC, pmco.kr) - 한국 개인 투자자 활성 커뮤니티
B. 레딧 (Reddit) — r/wallstreetbets, r/stocks, r/investing
C. 디시인사이드 주식갤러리 (gall.dcinside.com/board/lists/?id=stock_new3)
D. 네이버 금융 종목토론실 (finance.naver.com/item/board.naver — 시총 상위)
E. 인포스탁/팍스넷 종목토론 — 한국 중소형주 위주
F. X (Twitter) — Grok X 검색 활용
   - 미국 cashtag: ($TSLA OR $NVDA) since:{YESTERDAY} min_faves:50
   - 한국: "삼성전자" OR "SK하이닉스" since:{YESTERDAY} min_faves:30
   - 한국 핫 핸들: 슈카월드, 김프로, 박곰희 등

──────────────────────────────────────
[수집·카운팅 방법]
──────────────────────────────────────
1. 각 플랫폼별 언급 횟수 TOP10 종목 추출 (24시간 기준)
2. 종목별 매수 / 매도 / 중립 카운팅
3. 감성 점수 (-100 ~ +100)
4. 과열 신호 카운팅: "가즈아", "ㄱㅈㅇ", "to the moon", "🚀", "YOLO"
5. 루머/미검증 주장 별도 분류

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 플랫폼별 언급 TOP — 각 플랫폼당 TOP10 (분리 기재 필수)
A. 팸코 TOP10 / B. 레딧 TOP10 (한국·미국 분리) / C. 디시 주갤 TOP10
D. 네이버 종토 TOP10 / E. 인포스탁 TOP10 / F. X 미국 TOP10 / G. X 한국 TOP10
| 플랫폼 | 순위 | 종목 | 언급횟수 | 매수:매도:중립 | 감성점수 | 핵심 주장 1줄 |

표B. 통합 핫종목 — 3개 이상 플랫폼 동시 등장
| 종목 | 등장 플랫폼 수 | 총 언급횟수 | 통합 매수:매도 | 통합 감성 | 과열 신호 횟수 |

표C. 과열도 판정
| 종목 | 과열 신호 횟수 | 과열 등급 (🟢정상/🟡주의/🟠경고/🔴극단) | 24h 가격 vs 언급 격차 |

표D. 커뮤니티 vs 공식 데이터 괴리
| 종목 | 커뮤니티 주장 | P1B 공식 데이터 | 괴리 판정 (✅일치/⚠️괴리/⚠️과열/👁감시) |

표E. 루머·미검증 주장
| 종목/테마 | 주장 내용 | 출처 플랫폼 | 확산도 | 공식 확인 가능성 |

표F. X 인플루언서 인사이트 (min_faves 적용)
| 핸들 | 게시 요약 | 좋아요/리포스트 | cashtag/종목 | 기관성/개인성 |

표G. 한국 종토 특이 패턴
| 종목 | 시총 순위 | 24h 글 수 | 신규ID 비율 | 작전성 의심도 |

표H. 단계별 의사결정 분류
- 🟢 USE: 공식 + 커뮤니티 일치
- 🟡 WATCH: 한쪽만 강함, 추가 확인
- 🟠 NOISE: 과열 강함, 진입 회피
- 🔴 DROP: 작전 의심, 루머, 공식 데이터 정반대

──────────────────────────────────────
[필수 준수 사항]
──────────────────────────────────────
1. 모든 카운팅은 실제 검색 결과. 추정치 금지.
2. 검색 불가 시 "[검색실패]" 명기. 추측 금지.
3. X 검색은 Grok 네이티브 X 검색 활용, 좋아요 임계값 적용.
4. 종토 작전성은 단정 금지. "의심" 수준으로 표현.
5. 루머는 "주장:" 접두어. 사실처럼 적지 말 것.
6. 한국·미국 종목 분리.

마지막 한 줄: "오늘 가장 위험한 과열 신호 1개"`,
  },

  {
    code: 'P3', engine: 'grok', tags: ['core'], group: 'collect',
    title: 'P3 — X 트렌드 + 핫픽 v6 [부활]',
    desc: 'Grok X 검색 6패턴. cashtag/한국 종목/매크로 인플루언서/한국 인플루언서/섹터 키워드/옵션 이상.',
    keywords: 'X 트렌드 핫픽 6패턴',
    dep: 'P2 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'COLLECT-2',
    aiTarget: { name: 'GROK', url: 'https://grok.com' },
    prompt: `GROK — P3 X 트렌드 + 핫픽 v6
오늘: {TODAY}
기준 시점: P2 이후

당신은 X 실시간 트렌드 분석 전문가.
Grok 네이티브 X 검색 능력을 100% 활용해, 오늘 시장에 영향 줄
실시간 X 트렌드와 한국·미국 핫픽 종목을 발굴한다.

──────────────────────────────────────
[Grok X 검색 — 6가지 검색 패턴]
──────────────────────────────────────
패턴 1. 미국 cashtag 트렌드
- $SPY $QQQ $TSLA $NVDA $AAPL $META $GOOGL $AMZN 외
- 검색식: ($AAPL OR $TSLA) since:{YESTERDAY} min_faves:100
- 24시간 cashtag별 게시 수 + 평균 좋아요 + 감성

패턴 2. 한국 종목 한글 트렌드
- "삼성전자", "SK하이닉스", "카카오", "네이버", "현대차", "LG에너지솔루션"
- 검색식: ("삼성전자" OR "SK하이닉스") since:{YESTERDAY} min_faves:30

패턴 3. 매크로 인플루언서 (P1A 보조)
- @zerohedge @LizAnnSonders @SoberLook @Schuldensuehner
- 검색식: (from:zerohedge OR from:LizAnnSonders) since:{YESTERDAY}

패턴 4. 한국 X 인플루언서
- 슈카월드, 김단테, 박곰희, 김프로 등 (실제 핸들 확인)
- 검색식: from:[핸들] since:{YESTERDAY}

패턴 5. 섹터 키워드
- "AI", "반도체", "HBM", "원전", "방산", "조선", "2차전지"
- "earnings", "guidance", "FOMC", "CPI"

패턴 6. 급등/급락/이상 시그널
- "halted", "circuit breaker", "상한가", "하한가", "시간외 +"
- "Q1 beat", "guidance raised", "guidance cut"

──────────────────────────────────────
[수집 우선순위]
──────────────────────────────────────
1. 24시간 X 트렌드 — 게시 수 급증 cashtag/키워드 TOP10
2. 한국 시간외 단일가 상한가/하한가 (네이버페이)
3. 미국 시간외 +5% 이상 (Yahoo afterhours)
4. 어제 한국 상한가/급등 후속 X 추적
5. 미국 옵션 거래량 이상치 — Unusual Whales, X cashtag
6. X 트렌딩 토픽 (글로벌 / 한국)

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. X cashtag 트렌드 TOP10 (미국)
| 순위 | $cashtag | 24h 게시수 | 평균 좋아요 | 감성 | 핵심 내러티브 1줄 |

표B. X 한국 종목 트렌드 TOP10
| 순위 | 종목명 | 24h 게시수 | 평균 좋아요 | 감성 | 핵심 내러티브 1줄 |

표C. 매크로 인플루언서 핵심 게시 TOP5
| 핸들 | 게시 요약 | 좋아요/리포스트 | 시장 시사점 |

표D. 한국 X 인플루언서 핵심 게시 TOP5
| 핸들 | 게시 요약 | 좋아요/리포스트 | 종목/테마 |

표E. 섹터 키워드 강도 (24시간)
| 키워드 | 게시 수 | 전일 대비 | 주도 종목 | 분위기 |

표F. 한국 시간외 급등/급락 (네이버페이 06:00 이전)
| 종목 | 시간외 등락률 | 거래량 | 추정 트리거 | X 언급도 |

표G. 미국 afterhours 급등/급락 (Yahoo Finance)
| 종목 | AH 등락률 | 거래량 | 트리거 (실적/뉴스) | X 언급도 |

표H. 어제 한국 상한가/급등 종목 후속 추적
| 종목 | 어제 등락률 | 오늘 시간외 | X 24h 언급 변화 | 지속/소멸 판정 |

표I. 미국 옵션 이상 활동 (Unusual Options Activity)
| 종목 | 옵션 거래량 vs 평균 | Call/Put | 만기 | X 언급도 | 출처 |

표J. X 트렌딩 토픽 (한국·글로벌)
| 토픽 | 카테고리 | 게시 수 | 시장 관련성 |

표K. P1A·P1B·P2·P3 통합 — 오늘 핫픽 TOP5
| 순위 | 종목/테마 | 등장 카드 | 신호 강도 | 진입 가능성 | 무효화 조건 |

──────────────────────────────────────
[필수 준수 사항]
──────────────────────────────────────
1. Grok X 검색 결과만 사용. 추정·기억 금지.
2. 게시 수·좋아요는 실제 검색 결과 (없으면 "[검색실패]")
3. 시간외 데이터는 한국 시간 06:00 이전 스냅샷 명기
4. 옵션 데이터는 출처 명기 (Unusual Whales, CBOE 등)
5. 확인 못 한 핸들은 "[핸들미확인]"
6. 미국 cashtag와 한국 종목은 분리 출력

마지막 한 줄: "오늘 가장 강한 X 신호 1개"`,
  },

  {
    code: 'D1', engine: 'grok', tags: ['core'], group: 'collect',
    title: 'D1 — 공식 데이터 보강 v6',
    desc: '공시 URL + 단위 검증 + 발표일정 라벨 강제.',
    keywords: '공시 단위 발표일정',
    dep: 'P1A·P1B·M1 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'COLLECT-3',
    aiTarget: { name: 'GROK', url: 'https://grok.com' },
    prompt: `GROK — D1 공식 데이터 보강 v6
오늘: {TODAY}

당신은 공식 데이터 검증관.
P1A·P1B의 수치·일정을 1차 공식 출처로 검증·보강하고,
단위·발표일정·기관 매칭 오류를 색출한다.

──────────────────────────────────────
[검증 4축]
──────────────────────────────────────
A. 공시 검증 — DART (한국) / SEC EDGAR (미국)
B. ETF·자금흐름 — etf.com, ETFdb, ICI
C. 목표주가 변경 — 증권사명 명시 (당사 리포트)
D. 커뮤니티 주장 vs 공식 확인 비교

──────────────────────────────────────
[단위 검증 강제]
──────────────────────────────────────
삼성전자 분기 영업이익 정상 범위: 5~80조원
SK하이닉스 분기 영업이익 정상 범위: 1~50조원
NVDA 분기 매출 정상 범위: $20B~$60B
TSLA 분기 매출 정상 범위: $20B~$30B

이 범위 밖이면 **단위 오류 가능성** 표기. 7.81조 같은 1자리 단위 의심.

──────────────────────────────────────
[발표 일정 라벨 강제]
──────────────────────────────────────
- [확정 MM-DD]: 이미 발표
- [예정 MM-DD]: 발표 예정
- [추정/Nowcast]: 시장 추정

⚠ 발표 전을 "확정"으로 쓰면 SEVERE ERROR.

──────────────────────────────────────
[기관 매칭 강제]
──────────────────────────────────────
- PCE → BEA / CPI → BLS / GDP → BEA
- VIX·VVIX → Cboe / 한국 외환보유 → 한국은행
- 잘못 매칭 시 자동 강등

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 24시간 공시 검증 (DART + SEC)
| 종목 | 공시 종류 | 핵심 내용 | 출처 4단 (URL/시점/단위확인/기관) | 시장 영향 |

표B. ETF·자금흐름 (3일)
| ETF | 자금 흐름 | 누적 | 출처 (etf.com URL) |

표C. 목표주가 변경 (증권사 명시)
| 종목 | 증권사 | 신/구 목표가 | 변경 사유 | 출처 |

표D. 발표 일정 라벨 점검
| 지표 | P1A 표기 | 실제 발표 상태 | 라벨 정정 |

표E. 단위 검증 결과
| 종목/지표 | P1A·P1B 표기 | 정상 범위 | 판정 |

표F. 기관 매칭 검증
| 지표 | 인용된 기관 | 정확한 기관 | 정정 필요 |

표G. 미확인 항목 로그
출처 4단 미충족 항목 별도 기재.

마지막 한 줄: "오늘 단위/일정 오류 위험 1개"`,
  },

  {
    code: 'N0', engine: 'grok', tags: ['core'], group: 'collect',
    title: 'N0 — 뉴스 신뢰도 필터 v6 [신규]',
    desc: 'G1 전달 전 뉴스 정제. USE/WATCH/EXCLUDE.',
    keywords: '뉴스 신뢰도 필터 정제',
    dep: 'P1A·P1B·P2·P3·M1·M2·D1 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'COLLECT-3',
    aiTarget: { name: 'GROK', url: 'https://grok.com' },
    prompt: `GROK — N0 뉴스 신뢰도 필터 v6
오늘: {TODAY}

당신은 뉴스 신뢰도 검증관.
G1으로 전달되기 전 모든 뉴스/주장을 신뢰도별로 분류한다.

──────────────────────────────────────
[분류 4단계]
──────────────────────────────────────
✅ USE (사용): 1차 출처 + 출처 4단 충족
🟡 WATCH (감시): 2차 출처 또는 일부 미확인
🟠 NOISE (소음): 커뮤니티 과열 또는 미검증 주장
🔴 DROP (제거): 작전 의심, 루머 확산, 공식 부정

──────────────────────────────────────
[검증 항목]
──────────────────────────────────────
A. 출처 4단 충족 (기관/URL/시점/단위)
B. 1차 vs 2차 출처
C. P2 작전성 의심 여부
D. D1 단위/일정 검증 통과 여부
E. 공식 확인 가능성

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. USE — G1 전달 항목
| 항목 | 출처 | 신뢰도 | 단위/일정 검증 |

표B. WATCH — 추가 확인 후 결정
| 항목 | 부족 항목 | 추가 검증 필요 |

표C. NOISE — 본문 제외, 로그만
| 항목 | 사유 |

표D. DROP — 완전 제거
| 항목 | 사유 (작전/루머/허위) |

마지막 한 줄: "오늘 가장 위험한 노이즈 1개"`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 판단 (judge) — 사람이 직접 AI에 실행
  // ═══════════════════════════════════════════════════════════════════════

  {
    code: 'M0', engine: 'grok', tags: ['core'], group: 'judge',
    title: 'M0 — 레짐 분류 v6',
    desc: 'P1A·P1B 수치 기반 레짐 판정. 자체 수치 생성 금지.',
    keywords: '레짐 분류 분석',
    dep: 'P1A·P1B 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `GROK — M0 레짐 분류 v6
오늘: {TODAY}
기준 시점: P1A~P3 완료 후

당신은 시니어 매크로 PM.
P1A·P1B에서 수집한 수치만 사용해 오늘 레짐을 판정한다.

⚠ 핵심 원칙: M0는 분석만 한다.
새 수치 생성 금지. P1A·P1B에 없는 데이터는 "(데이터 부족)" 처리.

──────────────────────────────────────
[레짐 분류 4축]
──────────────────────────────────────
1. Risk: Risk-On / Risk-Off / Mixed
2. Trend: Trend-Up / Trend-Down / Range
3. Liquidity: Loose / Tight / Neutral
4. Volatility: Low / Mid / High

──────────────────────────────────────
[레짐 전환 트리거 — 3개 점검]
──────────────────────────────────────
트리거1: VVIX 절대값 > 110 또는 전일 대비 +15% → Vol High 경보
   ⚠ VVIX 정상 범위 80~150. 20~30 수준이면 VIX와 혼동한 것이므로 재확인.
트리거2: 외국인 순매수 방향 3일 전환 → 레짐 전환 신호
트리거3: TLT/IEF 급등 + 지수 하락 → Risk-Off 강화 / TLT 급락 + 지수 상승 → Risk-On

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 레짐 4축 판정
| 축 | 판정 | 근거 (P1A/P1B 수치 인용) |

표B. 핵심 드라이버 3개
| 순위 | 드라이버 | 출처 (P1A/P1B 인용) | 영향 강도 |

표C. 레짐 전환 경보
| 트리거 | 현재값 | 임계값 | 판정 (🔴HIGH/🟡MED/🟢NONE) |

표D. 변동성 유발 이벤트 3개 (오늘~3일)
| 이벤트 | KST 시간 | 영향 |

표E. 확신 금지 구간 (오늘 함부로 판단 말 것)
| 항목 | 사유 |

──────────────────────────────────────
[필수 준수]
──────────────────────────────────────
1. 모든 수치 인용은 출처 카드 명기 (예: "P1A 표B 기준")
2. P1A·P1B에 없는 수치 도입 금지
3. VVIX와 VIX 혼동 금지

마지막 한 줄: "오늘 가장 조심할 오판 1개"`,
  },

  {
    code: 'M1', engine: 'grok', tags: ['core'], group: 'judge',
    title: 'M1 — 이상치 스캔 v6',
    desc: '가격·뉴스·커뮤니티 비대칭 신호. 출처 검증 강제.',
    keywords: '이상치 비대칭',
    dep: 'M0·P2·P3 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `GROK — M1 이상치 스캔 v6
오늘: {TODAY}

P1A~P3 데이터만 기반으로 비대칭 신호를 발굴한다.
단순 급등주 나열 금지.

──────────────────────────────────────
[이상치 5유형]
──────────────────────────────────────
1. 가격선행형: 가격이 오르는데 공식 뉴스 없음
2. 뉴스선행형: 뉴스 강한데 가격 미반응
3. 과열형: 커뮤니티 폭발 + 가격 미동
4. 역과열형: 커뮤니티 비관 + 가격 강세
5. 2차확산형: 미국 리더 강세 후 한국 후발 미반응

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 미국 이상치 TOP7
| 종목 | 유형 | 가격/뉴스/커뮤니티 강도 | 출처 (P1B/P2/P3 인용) |

표B. 한국 이상치 TOP7
| 종목 | 유형 | 가격/뉴스/커뮤니티 강도 | 출처 |

표C. 이상치 종합 분류
| 유형 | 종목 수 | 핵심 종목 | 의사결정 가치 |

표D. 알파 후보 5개 (이상치 중 진입 가능성 높은 것)
| 종목 | 트리거 | 진입 조건 | 무효화 조건 |

표E. Cross-Asset Divergence
- 채권 vs 주식 / 달러 vs 금 / VIX vs 지수 발산 점검

마지막 한 줄: "오늘 가장 강한 비대칭 신호 1개"`,
  },

  {
    code: 'M2', engine: 'grok', tags: ['core'], group: 'judge',
    title: 'M2 — 섹터 체인맵 v6',
    desc: '촉매 → 1차/2차 수혜 → 피해. 미↔한 매칭.',
    keywords: '섹터 체인 수혜',
    dep: 'M0·M1 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `GROK — M2 섹터 체인맵 v6
오늘: {TODAY}

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 가장 강한 촉매 3개 + 체인
| 촉매 | 1차 수혜 | 2차 수혜 | 피해 업종 | 출처 (M0/M1 인용) |

표B. 미국 리더 ↔ 한국 확산
| 미국 종목/섹터 | 1차 한국 매칭 | 2차 한국 매칭 | 매칭 신뢰도 |

표C. 대장/후발/방어 3단 구조
| 단계 | 미국 | 한국 | 비고 |

표D. 잘못된 연결·과잉 해석
| 잘못된 연결 | 사유 | 처리 |

마지막 한 줄: "오늘 가장 강한 체인 1개"`,
  },

  {
    code: 'M3', engine: 'grok', tags: ['core'], group: 'judge',
    title: 'M3 — 후보 점수화 v6',
    desc: '7축 채점 (출처 신뢰도 추가). A/B/C 등급.',
    keywords: '점수화 등급 출처',
    dep: 'M1·M2·D1·P2·P3 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `GROK — M3 후보 점수화 v6
오늘: {TODAY}

──────────────────────────────────────
[채점 7축 (각 0~5점, 총 35점)]
──────────────────────────────────────
1. 촉매 신선도 (24h 내 새 촉매)
2. 데이터 확인도 (D1에서 검증됨)
3. 커뮤니티 확산성 (P2 카운팅 기반)
4. 기술적 위치
5. 유동성/실행성
6. 리스크 통제 용이성
7. **출처 신뢰도** [v6 신규] — 출처 4단 충족 여부, 1차 vs 2차 출처

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 종목 점수표 (0~5점, 총 35점 만점)
| 종목 | 1.촉매 | 2.확인 | 3.확산 | 4.기술 | 5.유동 | 6.리스크 | 7.출처 | 합계 | 등급 |
- A등급: 28점 이상 (즉시 추적)
- B등급: 21~27점 (신호 대기)
- C등급: 20점 이하 (제외)

표B. 실행 플레이북
| 종목 | 등급 | 진입 트리거 | 무효화 조건 | 출처 (D1/P2/P3 인용) |

표C. 공격형/균형형/방어형 바구니
| 유형 | 종목 | 비중 |

[S1 사이징 자동 출력]
확신도 × 신호단계:
         | 초동신호 | 검증됨 | 추격구간
High(A)  |  5~8%   | 10~15% |  금지
Mid(B)   |  3~5%   |  5~8%  |  3~5%
Low(C)   |  1~3%   |  3~5%  |  금지

| 종목 | 확신도 | 단계 | 권장비중 | 포트상관경보 |
동일섹터 2종목↑ 동시 보유 → 합산 15% 상한

마지막 한 줄: "오늘 최우선 감시 3개"`,
  },

  {
    code: 'T1', engine: 'grok', tags: ['core'], group: 'judge',
    title: 'T1 — Thesis 헬스체크 v6 [신규]',
    desc: '보유 포지션 thesis 매일 점검. ALIVE/DEGRADED/BROKEN 판정.',
    keywords: 'thesis 헬스체크 ALIVE BROKEN',
    dep: 'M0·M3·D1·P2·P3 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `GROK — T1 Thesis 헬스체크 v6
오늘: {TODAY}

당신은 시니어 포트폴리오 매니저.
보유/관심 자산의 thesis가 오늘도 살아있는지 매일 아침 점검한다.

──────────────────────────────────────
[보유 포트 입력 (수동)]
──────────────────────────────────────
[여기에 보유 자산 + 각 thesis 붙여넣기]
예:
- A04 SK하이닉스: HBM 슈퍼사이클 + AI 수요
- A06 삼성전자: 메모리 회복 + AI 수혜
- D01 XLE: 유가 반등 + 에너지 인플레

──────────────────────────────────────
[판정 3단계]
──────────────────────────────────────
🟢 ALIVE: thesis 유효, 가격·거래량·뉴스 일관
🟡 DEGRADED: thesis 약화 신호. 비중 축소 검토.
🔴 BROKEN: thesis 무효. 즉시 exit 계획.

──────────────────────────────────────
[판정 기준]
──────────────────────────────────────
- M0 레짐 변화가 thesis와 충돌
- M3 점수 7축 합계 18점 미만
- D1에서 단위/일정 오류 발견
- P2 커뮤니티 과열 🔴 또는 작전 의심
- 1차 출처에서 thesis 부정 (예: 가이던스 컷)

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 보유 자산 thesis 판정
| 자산 ID | 자산명 | 핵심 thesis | 판정 | 변화 사유 | 권고 액션 |

표B. BROKEN 자산 즉시 exit 계획
| 자산 | exit 트리거 | 단계별 청산 |

표C. DEGRADED 자산 모니터링 강화
| 자산 | 약화 신호 | 추가 점검 항목 |

표D. ALIVE 자산 강화 가능성
| 자산 | 강화 신호 | 비중 증액 가능성 |

마지막 한 줄: "오늘 가장 위험한 보유 thesis 1개"`,
  },

  {
    code: 'V1', engine: 'gpt', tags: ['core'], group: 'judge',
    title: 'V1 — Alpha Validator (GPT) v6',
    desc: '정량 검증 + 출처 교차검증 + 단위 검증.',
    keywords: 'validator 정량 단위 시점 출처',
    dep: 'M3·D1·P1B 결과',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `GPT — V1 Alpha Validator v6
오늘: {TODAY}

당신은 시니어 정량 검증관.
M3 후보를 GPT의 정량 분석 능력으로 교차 검증한다.

──────────────────────────────────────
[인풋]
──────────────────────────────────────
{M3_OUTPUT}
{D1_OUTPUT}
{P1B_OUTPUT}

──────────────────────────────────────
[검증 8축]
──────────────────────────────────────
1. Statistical Confidence (Low/Med/High)
2. Economic Rationale 명확성
3. Historical Analog Count
4. Edge Half-life (Intraday/1~3D/1~2W/2~4W)
5. Factor Overlap Risk
6. Crowding Risk
7. Thesis Fragility
8. Fail-fast Trigger

──────────────────────────────────────
[추가 검증 — v6 신규]
──────────────────────────────────────
A. 단위 교차검증: D1 단위 검증 결과와 일치하는가
B. 시점 교차검증: D1 발표 라벨과 일치하는가
C. 기관 교차검증: D1 기관 매칭과 일치하는가
D. 출처 4단 점검: 모든 인용 수치에 4단 표기

⚠ 단위·시점·기관 중 하나라도 불일치 → 자동 EXCLUDE

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. Alpha Validation Table (8축 점수)
| 종목 | 1.SC | 2.ER | 3.HA | 4.EHL | 5.FO | 6.CR | 7.TF | 8.FF | 합계 |

표B. Historical Analog 요약
| 종목 | 유사 사례 | 당시 결과 | 시사점 |

표C. Fail-fast 조건
| 종목 | 트리거 수치 | 시간 한계 |

표D. v6 추가 검증 — 단위/시점/기관/출처
| 종목 | 단위 | 시점 | 기관 | 출처 4단 | 통과 여부 |

표E. 최종 분류
| 종목 | PROMOTE / HOLD / EXCLUDE | 사유 |

마지막 한 줄: "오늘 가장 검증 강한 종목 1개"`,
  },

  {
    code: 'P0', engine: 'grok', tags: ['core'], group: 'judge',
    title: 'P0 — 포트 브리지 v6',
    desc: '보유 자산 × 오늘 신호 매트릭스. 중복 노출 점검.',
    keywords: '포트 브리지 중복',
    dep: 'M0·M3·V1 이후',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `GROK — P0 포트 브리지 v6
오늘: {TODAY}

역할: 오늘 신호를 실제 보유 포트에 연결하는 리스크 매니저

──────────────────────────────────────
[인풋]
──────────────────────────────────────
[보유 포트 상태 붙여넣기]
{M0_OUTPUT}
{M3_OUTPUT}
{V1_OUTPUT}

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 보유자산 영향 매트릭스 (Bull/Base/Bear 시나리오)
| 자산 | Bull % | Base % | Bear % | 중복 노출 경보 | 액션 |

표B. 중복 노출 체크
- AI/반도체 클러스터 합산 비중
- 후보 편입 시 변화
- 상한 25% 초과 위험

표C. 새 후보 vs 기존 포트 충돌/보완
| 후보 종목 | 기존 보유와 충돌 | 보완 가능성 |

표D. 오늘 포트 핵심 액션 (시간 우선순위)
🔴 즉시 (09:00~11:00): 무효화 트리거 발동 종목
🟠 오전 중 (11:00~14:00): 외인/기관 수급 확인 후 결정
⚫ 장 마감 후 (15:30 이후): 미국 지표 발표 대기

⚠ A10(TDF2035)·A11·A14는 조정 대상 제외
⚠ D01(XLE)·D02(ITA) 진입 전 괴리율 확인

마지막 한 줄: "오늘 포트 최대 리스크 1개"`,
  },

  {
    code: 'I2', engine: 'grok', tags: ['core'], group: 'judge',
    title: 'I2 — Thesis Breaker v6',
    desc: 'Bear case 3개 + Historical analog + Fail-fast 5조건.',
    keywords: 'thesis breaker bear fail-fast',
    dep: 'M3·P0 이후',
    visible: true, enabled: true, defenseLine: true,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'ChatGPT', url: 'https://chatgpt.com' },
    prompt: `GROK — I2 Thesis Breaker v6
오늘: {TODAY}

역할: 오늘 보고서의 반대편 검사기.
맞을 이유보다 틀릴 가능성을 먼저 강제 검토.

──────────────────────────────────────
[인풋]
──────────────────────────────────────
{P1A_OUTPUT}
{P1B_OUTPUT}
{M0_OUTPUT}
{M1_OUTPUT}
{M2_OUTPUT}
{D1_OUTPUT}
{M3_OUTPUT}
{P0_OUTPUT}

──────────────────────────────────────
[필수 수행]
──────────────────────────────────────
1. Bear Case 3개 — 구체적 수치·조건 포함, 출처 명시
2. Historical Analog 3개 — 비슷한 상황 실패 사례
3. Fail-fast 조건 5개 — 수치 임계값 + 시간 한계
4. 오늘 보고서에서 가장 과신한 부분 1개

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. Bear Case 3개
| Bear Case | 구체 조건 (수치) | 의미 | 출처 (P1A/D1 인용) |

표B. Historical Analog 3개
| 사례 | 시기 | 유사점 | 교훈 |

표C. Fail-fast 5조건
| 조건 | 수치 임계 | 시간 한계 | 연관 종목 |

표D. 무효화 트리거
| 트리거 | 발동 시 행동 |

마지막 한 줄: "오늘 보고서에서 가장 과신한 부분 1개"`,
  },

  {
    code: 'G1', engine: 'gpt', tags: ['core'], group: 'judge',
    title: 'G1 — 종합 시장 브리핑 v7 [전면개편]',
    desc: '15개 섹션 종합 보고서. SIGNAL 카테고리 신설로 분석 카드 살림.',
    keywords: '종합 보고서 15개 섹션 SIGNAL',
    dep: '전 카드',
    visible: true, enabled: true, defenseLine: true,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `GPT — G1 종합 시장 브리핑 v7
오늘: {TODAY}

당신은 단순 필터가 아니라 "수석 시장 에디터"다.
앞단 17개 카드(P1A~N0)가 수집·분석한 모든 결과를 받아서
HJ 투자자 한 명을 위한 종합 시장 브리핑 보고서를 작성한다.

NOISE/DROP은 출처 불명·루머·작전 의심에만 한정 적용.
M0~AV의 분석·판단·검증 결과는 "분석"이라는 이유로 버리지 말 것.
이들은 v7의 본문 재료다.

──────────────────────────────────────
[인풋 (17개 카드)]
──────────────────────────────────────
{P1A_OUTPUT} {P1B_OUTPUT} {P2_OUTPUT} {P3_OUTPUT}
{M0_OUTPUT} {M1_OUTPUT} {M2_OUTPUT} {D1_OUTPUT} {M3_OUTPUT}
{T1_OUTPUT} {AV_OUTPUT} {V1_OUTPUT} {P0_OUTPUT}
{I2_OUTPUT} {N0_OUTPUT} {R1_OUTPUT}

──────────────────────────────────────
[사실 신뢰도 분류]
──────────────────────────────────────
🔵 VERIFIED (1차 출처 + URL + 시점 + 단위 4조건 충족)
🟦 SIGNAL (검증·필터링된 의사결정 신호)
   ├ T1 thesis 판정 (ALIVE/DEGRADED/BROKEN)
   ├ V1·AV 검증 결과 (PROMOTE/HOLD/EXCLUDE)
   ├ P0 포트 액션 (시간 우선순위)
   ├ I2 Bear case + Fail-fast 트리거
   └ M3 종목 점수표 (A/B/C 등급)
🟡 WATCH (전망/의견 — [미확인] 라벨 유지)
🟠 NOISE (루머·과열 — 본문 제외, 로그만)
🔴 DROP (홍보성·중복·출처 불명 — 완전 제거)

⚠ M0/M1/M2/M3/T1/AV/V1/P0/I2 출력은
  "분석/판단"이라는 이유만으로 NOISE 처리 금지.
  이들은 SIGNAL이다. 본문에 살려라.

──────────────────────────────────────
[Sanity Check 자동 점검]
──────────────────────────────────────
- 삼성전자 분기 OP 1~80조원 범위 밖 → 의심
- SK하이닉스 분기 OP 1~50조원 범위 밖 → 의심
- VVIX 30 같은 비정상 → VIX 혼동 의심
- PCE를 BLS로 매칭 → DROP
- "예정"인데 "확정" 표기 → 강등
- 발표 전 일정을 확정 처리 → SEVERE ERROR

──────────────────────────────────────
[VERIFIED 4조건 강제]
──────────────────────────────────────
모두 충족해야 🔵 VERIFIED 도장:
1. 1차 출처 (기관 직접) URL 명기
2. 발표일/시점 명기
3. 단위 원문 확인
4. 기관 매칭 정확

하나라도 빠지면 자동 🟡 WATCH로 강등.

──────────────────────────────────────
[출력 — 종합 시장 브리핑 보고서 (15개 섹션)]
──────────────────────────────────────

[0] 헤더 / 분석 시점
- 분석 기준일 (KST 시간 포함)
- 데이터 수집 기간
- 핵심 한 줄 요약

[1] HERO 배너 — 오늘의 핵심 5개
| 항목 | 값 | 한 줄 해석 |
- 레짐 분류 / 레짐 전환 경보 / 핵심 드라이버 / KOSPI·USD-KRW·VVIX / 핵심 액션 1줄

[2] 레짐 드라이버 × 시나리오 매트릭스
M0 결과 기반. 핵심 드라이버 3개 → Bull/Base/Bear 시나리오.
| 드라이버 | Base | Bull | Bear | 운용 포인트 | 신뢰도 |

[3] 매크로 요약
M0 + M1 + D1 통합.
- 핵심 지표 (CPI/PCE/금리/GDP/PMI)
- 발표 일정 [확정]/[예정]/[추정] 라벨
- 변동성 유발 이벤트 3개
- 채권·환·원자재 흐름

[4] 섹터 체인맵 (뉴스 → 종목)
M2 결과 기반.
| 촉매 | 1차 수혜 | 2차 수혜 | 피해 업종 | 미↔한 매칭 |

[5] 커뮤니티 괴리 — Buzz vs Fact
P2 + P3 통합. 5개 사이트 + X 6패턴.
| 종목/테마 | 커뮤니티 버즈 | 실제 데이터 | 판정 |
- 작전성 의심 종목 별도
- 신규ID 비율 비정상 별도

[6] 핫섹터 TOP5 + 자금흐름
M1 + M2 + D1 통합.
| 순위 | 섹터 | 강도 | ETF 자금흐름 | 외인/기관 수급 |

[7] 종목 플레이북 — A/B/C 등급
M3 + V1 + AV 통합.
| 종목 | 등급 | 촉매 | Confidence | Half-life | 진입/무효화 | Crowding | 권장비중 |

[8] 포트폴리오 헬스체크 (T1)
T1 결과 기반. ALIVE/DEGRADED/BROKEN 판정.
BROKEN 종목은 별도 강조 (즉시 exit 계획).

[9] 영향 매트릭스 — 보유자산 × 시나리오
P0 + T1 통합. ⚠ A10/A11/A14 조정 대상 제외.
| 자산 | Bull | Base | Bear | 중복 노출 경보 | 액션 |

[10] 시나리오별 대응 가이드
| 시나리오 | 확률 | 핵심 행동 | 보유 우선순위 | 진입 금지 |

[11] 액션 리스트 — 시간 우선순위
🔴 즉시 (09:00~11:00)
🟠 오전 중 (11:00~14:00)
⚫ 장 마감 후 (15:30 이후)
각 액션: 근거 + 무효화 조건

[12] Thesis Breaker — Bear Case 강제
I2 결과 기반.
- Bear Case 3개
- Historical analog 3개
- Fail-fast 5조건

[13] 어제 복기 — R1
R1 결과 기반.
- 어제 액션 적중도
- 미이행 액션 (R1 carryover loop)
- 오판 원인
- 오늘 가중치 조정 5줄

[14] 경제지표 캘린더 — 오늘~3일
| KST 시간 | 지표 | 국가 | 영향도 | 컨센서스 | Beat/Miss 시나리오 |

[15] 검증 로그 — 투명성 보장
- 표A. VERIFIED 항목 + 출처 4단
- 표B. SIGNAL 항목 + 원본 카드
- 표C. NOISE/DROP 제거 로그 + 사유
- 표D. Sanity check 의심 항목 강등 로그
- 표E. C1 입력용 압축 패킷

──────────────────────────────────────
[필수 준수 사항]
──────────────────────────────────────
1. 모든 수치는 인풋 카드에서 그대로 인용. 자체 학습 데이터 보충 절대 금지.
2. 출처 4단 미충족 수치는 [미확인] 라벨 보존.
3. M0~AV의 분석은 SIGNAL로 살릴 것.
4. NOISE/DROP은 이유 명시 후 별도 로그.
5. 미국·한국 분리 표기.

마지막 한 줄: "오늘 가장 중요한 의사결정 포인트 1개"`,
  },

  {
    code: 'C1', engine: 'claude', tags: ['core'], group: 'judge',
    title: 'C1 — 최종 보고서 HTML v6',
    desc: '다크 카드형 HTML 대시보드. 출처 배지 + Hero 배너 + 시간 우선순위 액션.',
    keywords: 'HTML 대시보드 배지 액션',
    dep: 'G1·R1·T1·I2',
    visible: true, enabled: true, defenseLine: true,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'Claude', url: 'https://claude.ai' },
    prompt: `Claude — C1 최종 보고서 HTML 생성 v6
오늘: {TODAY}

──────────────────────────────────────
[인풋]
──────────────────────────────────────
{G1_OUTPUT}
{R1_OUTPUT}
{T1_OUTPUT}
{I2_OUTPUT}

──────────────────────────────────────
[필수 섹션]
──────────────────────────────────────
[1] Hero 배너 — 핵심 5개
[2] KPI 카드 (레짐/지수/환율/VIX) — 출처 배지 표기
[3] 레짐 드라이버 3개 + 시나리오 매트릭스
[4] 섹터 체인 (미↔한)
[5] 종목 플레이북 — Confidence/Half-life/Crowding/Thesis Break
[6] 포트 헬스체크 (T1) — ALIVE/DEGRADED/BROKEN
[7] 영향 매트릭스 (A10/A11/A14 조정 제외)
[8] 시간 우선순위 액션 — 🔴/🟠/⚫
[9] R1 이월 항목 (있으면 최상단)
[10] Thesis Breaker (I2)
[11] 검증 로그 (접이식)

──────────────────────────────────────
[출처 배지 4종]
──────────────────────────────────────
- src-web (1차 출처 직접 링크)
- src-gpt (G1 원본)
- src-infer (Claude 추론)
- src-na (미확인)

──────────────────────────────────────
[디자인]
──────────────────────────────────────
- 다크 카드형 HTML
- VERIFIED → 파란 배지, WATCH → 노란 배지
- BROKEN 자산 → 빨간 배너 강조
- 액션 리스트 시간대별 색상 구분

present_files로 HTML 제출.`,
  },

  {
    code: 'R1', engine: 'gpt', tags: ['core'], group: 'judge',
    title: 'R1 — 다음날 복기 v6',
    desc: '전날 보고서 vs 실제 비교. 미이행 carryover.',
    keywords: '복기 carryover 가중치',
    dep: '',
    visible: true, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    aiTarget: { name: 'ChatGPT', url: 'https://chatgpt.com' },
    prompt: `GPT — R1 다음날 복기 v6
오늘: {TODAY}

──────────────────────────────────────
[인풋]
──────────────────────────────────────
[전날 보고서 핵심 요약]
[전날 액션 리스트]
[실제 시장 결과]

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 전날 액션리스트 이행 리뷰
| 항목 | 우선순위 | 이행 여부 | 결과/사유 | 오늘 처리 |

표B. 예측 적중도
| 영역 | 방향 | 타이밍 | 사이즈 | 종합 |

표C. 실패 원인 분류
| 실패 항목 | 원인 카테고리 (출처/단위/일정/과열) |

표D. 미이행 액션 — Carryover
| 액션 | 사유 | 오늘 우선순위 (🔴/🟠/⚫) |

표E. 오늘 가중치 조정 5줄
1. ...
2. ...
3. ...
4. ...
5. ...

마지막 한 줄: "어제 가장 큰 교훈 1개"`,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 1-B 대상 (visible=false) — prompt 본문은 다음 단계에서 채움
  // 메타데이터만 미리 등록.
  // ═══════════════════════════════════════════════════════════════════════

  // ── 영구 제외 (enabled=false): AV, I3 ──
  {
    code: 'AV', engine: 'grok', tags: ['core'], group: 'optional',
    title: 'AV — Alpha Validator (Grok) v6 [신규]',
    desc: 'M3 후보 알파 필터링. 출처 신뢰도 강제.',
    keywords: 'alpha validator 필터 출처',
    dep: 'M3·V1·P2·P3 이후',
    visible: false, enabled: false, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `GROK — AV 알파 밸리데이터 v6
오늘: {TODAY}

당신은 알파 필터링 전문가.
M3 후보 종목들 중 진짜 진입 가치 있는 것만 걸러낸다.

──────────────────────────────────────
[필터 기준]
──────────────────────────────────────
1. 출처 신뢰도: M3 7번째 항목 (출처) 점수 4점 이상
2. 단위 검증 통과: D1 표E에서 정상 범위
3. 발표 라벨 정확: D1 표D에서 [확정] 또는 [예정] 정확
4. 기관 매칭 정확: D1 표F 통과
5. 커뮤니티 과열 아님: P2 표C 🔴극단/🟠경고 아님
6. 작전성 의심 아님: P2 표G 통과

──────────────────────────────────────
[3단 분류]
──────────────────────────────────────
🟢 PROMOTE: 6개 모두 통과 — 진입 후보
🟡 HOLD: 1~2개 미충족 — 신호 대기
🔴 EXCLUDE: 3개 이상 미충족 또는 작전성 의심 — 진입 금지

──────────────────────────────────────
[출력 형식]
──────────────────────────────────────
표A. 알파 필터링 결과
| 종목 | 6개 항목 통과 | 분류 | 사유 |

표B. PROMOTE 종목 — 진입 추천
| 종목 | 진입 트리거 | 무효화 조건 | 권장 비중 |

표C. HOLD 종목 — 추가 확인 후 결정
| 종목 | 부족 항목 | 추가 점검 |

표D. EXCLUDE 종목 — 진입 금지 사유
| 종목 | 실패 항목 | 사유 |

마지막 한 줄: "오늘 가장 신뢰도 높은 PROMOTE 1개"`,
  },
  {
    code: 'I3', engine: 'grok', tags: ['opt'], group: 'optional',
    title: 'I3 — 후발 확산 탐지',
    desc: '대장주가 아닌 이제 막 따라붙는 후발주 발굴.',
    keywords: '후발주 확산',
    dep: '',
    visible: false, enabled: false, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `GROK — I3 후발 확산 탐지 v8
오늘: {TODAY}
출력: 후발주 TOP8
| 순위 | 종목 | 소속테마 | 대장 대비 덜 오른 이유 | 확산 조짐 | 실패 리스크 |`,
  },

  // ── v0.2+ 부활 후보 (enabled=true, visible=false): 5장 ──
  {
    code: 'L-SUP', engine: 'grok', tags: ['opt'], group: 'optional',
    title: 'L-SUP — 수급 스캐너',
    desc: '외국인/기관 순매수·공매도·프로그램 수급 수집.',
    keywords: '수급 외인 기관',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `GROK — 수급 스캐너
오늘: {TODAY}

표S-A: 외국인 순매수/매도 TOP5
표S-B: 기관 순매수/매도 TOP5
표S-C: 공매도 잔고 급증 TOP5
표S-D: 프로그램 매매 방향
표S-E: 수급 종합 판정`,
  },
  {
    code: 'L-EVT', engine: 'grok', tags: ['opt'], group: 'optional',
    title: 'L-EVT — 오늘의 이벤트 캘린더',
    desc: '당일 경제지표·정책·이벤트 KST 시간순.',
    keywords: '이벤트 캘린더 경제지표',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `GROK — 오늘의 이벤트 캘린더
오늘: {TODAY}

KST 시간순 정리. Beat/Miss 시나리오 포함.
미확인 수치 추측 금지.
| 시간(KST) | 지표명 | 국가 | 영향도 | 이전값 | 컨센서스 | Beat시나리오 | Miss시나리오 |`,
  },
  {
    code: 'Q1', engine: 'grok', tags: ['new'], group: 'optional',
    title: 'Q1 — 수급 강제 테이블 (P1B 삽입용)',
    desc: 'P1B 마지막에 삽입. 외인/기관/공매도 수급 미출력 시 보고서 불완전 처리.',
    keywords: '수급 강제 외인 기관 공매도',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `[Q1 수급 강제 블록 — P1B 마지막에 추가]

아래 항목을 반드시 표 형식으로 출력하라. N/A 금지 — 가능한 출처에서 수집.

1. 외국인 순매수 TOP5 (코스피+코스닥): 종목 | 순매수금액(억) | 업종
2. 외국인 순매도 TOP5: 종목 | 순매도금액(억) | 업종
3. 기관 순매수 TOP5: 종목 | 순매수금액(억) | 업종
4. 공매도 잔고 급증 TOP3: 종목 | 잔고비율(%) | 전일 대비 변화
5. 프로그램 매매: 매수차익/매도차익 금액 + 방향 요약

출처 명시 필수. 전일 또는 당일 09:00 기준 데이터 사용.

⚠ 이 블록 미출력 시 보고서 불완전으로 처리`,
  },
  {
    code: 'S1', engine: 'grok', tags: ['new'], group: 'optional',
    title: 'S1 — 포지션 사이징 가이드 (M3 추가용)',
    desc: 'M3 결과 뒤에 자동 출력. 확신도×신호단계 매트릭스로 권장 비중 산출.',
    keywords: '사이징 비중 포지션',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `[S1 포지션 사이징 가이드 — M3 프롬프트 마지막에 추가]

M3 분석 결과 기반, 각 추천 종목 권장 비중 산출.

확신도 × 신호단계 매트릭스:
         | 초동신호 | 검증됨 | 추격구간
High(A)  |  5~8%   | 10~15% |  금지
Mid(B)   |  3~5%   |  5~8%  |  3~5%
Low(C)   |  1~3%   |  3~5%  |  금지

출력:
| 종목 | 확신도 | 단계 | 권장비중 | 포트상관경보 |

경보 조건:
- 동일 섹터 2종목↑ 동시 보유 → 합산 15% 상한 자동 적용
- 방향성 동일 종목 3개↑ → 1개 제외 경고`,
  },
  {
    code: 'M0-전환', engine: 'grok', tags: ['new'], group: 'optional',
    title: 'M0 보강 — 레짐 전환 감지 블록',
    desc: 'M0 프롬프트에 추가. VVIX·외인 방향전환·채권↔주식 3개 트리거 점검.',
    keywords: '레짐 전환 VVIX 트리거',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `[M0 레짐 전환 감지 블록 — M0 프롬프트에 추가]

현재 레짐 분류 후, 아래 전환 트리거 점검:

트리거1: VVIX
- VVIX 전일 대비 15%↑ → Trend→Range 전환 경보

트리거2: 외국인 순매수 방향 급전환
- 3일 연속 매도 → 오늘 순매수 전환 (또는 반대) → 레짐 전환 신호

트리거3: 채권↔주식 자금 이동
- TLT/IEF 급등 + 지수 하락 → Risk-Off 전환
- TLT/IEF 급락 + 지수 상승 → Risk-On 전환

출력:
| 트리거 | 발동 여부 | 강도 | 대응 |
레짐 전환 경보 수준: 🔴 HIGH / 🟡 MED / 🟢 NONE

⚠ 🔴 HIGH 발동 시: 당일 신규 진입 금지 경고`,
  },

  // ── 단타 (daytrade): 4장 ──
  {
    code: 'DT-P1A', engine: 'grok', tags: ['core'], group: 'daytrade',
    title: 'P1-A — 장전 팩트 수집',
    desc: '08:00~08:30. 야간선물·외인·옵션·베이시스·미장·이벤트. 해석 최소.',
    keywords: '단타 장전 수집',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'DT-COLLECT',
    prompt: `GROK — 단타 장전 팩트 수집
날짜: {TODAY} / 08:00~08:30

역할: 한국 ETF 단타용 장전 데이터 수집. 해석 최소, 수치 위주.

수집 항목:
1. 코스피200 야간선물 등락률
2. 외국인 선물 전일 순매수/매도 (계약수)
3. 외국인 코스피 현물 전일 순매수/매도
4. 삼성전자 외국인 수급
5. SK하이닉스 외국인 수급
6. 콜/풋 옵션 분위기
7. 베이시스 상태
8. 미국 3대 지수 전일 등락률
9. Fear & Greed Index
10. 오늘 핵심 이벤트 2개`,
  },
  {
    code: 'DT-P1B', engine: 'claude', tags: ['core'], group: 'daytrade',
    title: 'P1-B — 장전 방향 판단',
    desc: '08:30~09:00. P1-A 결과로 오늘 방향(레버/인버/관망) + 외인 의도 + 무효화 조건.',
    keywords: '단타 방향 판단 외인',
    dep: 'P1-A 결과',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `Claude — 단타 장전 판단
날짜: {TODAY} / 08:30~09:00

인풋: [P1-A 결과 붙여넣기]

판단 우선순위:
1.외국인 선물 방향 2.외국인 현물 방향
3.삼성전자·SK하이닉스 수급 4.옵션 분위기
5.베이시스 6.미국장 영향 7.오늘 이벤트

반드시 판단:
① 오늘 방향: 레버리지 / 인버스 / 관망
② 신뢰도: 상/중/하
③ 외인 의도: 지수 부양 / 고점 유인 / 하락 유도 / 애매
④ 반도체 역할
⑤ 진입 타이밍
⑥ 무효화 조건 1개`,
  },
  {
    code: 'DT-P2', engine: 'claude', tags: ['core'], group: 'daytrade',
    title: 'P2 — 장중 재점검',
    desc: '09:20~09:40. 아침 시나리오 유효 여부·갭 페이크·추격 위험 재판단.',
    keywords: '단타 장중 검증',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `Claude — 단타 장중 재점검
날짜: {TODAY} / 09:20~09:40

현재 확인:
1.코스피200 선물 현재 등락 2.코스피/코스닥 현재
3.외국인 현물 장중 수급 4.삼성전자/하이닉스 흐름
5.시초가 대비 방향 6.장초 갭 후 되밀림 여부

판단:
① 아침 시나리오 유지 여부
② 지금 장 성격: 추세/유인/흔들기
③ ETF 진입 가능 여부
④ 추격 매수 위험
⑤ 실행 가이드`,
  },
  {
    code: 'DT-P3', engine: 'claude', tags: ['core'], group: 'daytrade',
    title: 'P3 — 마감 복기',
    desc: '15:30 이후. 방향·타이밍·외인 해석·반도체 판단 정확도. 내일 수정 규칙 1개.',
    keywords: '단타 복기 마감',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `Claude — 단타 마감 복기
날짜: {TODAY} / 15:30 이후

복기 포인트:
1.방향 자체는 맞았는가?
2.진입 타이밍은 맞았는가?
3.외인 해석이 맞았는가?
4.반도체 견인축 판단은?
5.오늘 가장 크게 틀린 지점 1개
6.내일 수정할 규칙 1개`,
  },

  // ── 노마드 (nomad): 2장 ──
  {
    code: 'NOMAD-G', engine: 'grok', tags: ['opt'], group: 'nomad',
    title: '노마드 1단계 — Grok 1차 발굴',
    desc: '한국 상장기업 중 5~10년 장기 복리형 후보를 X·뉴스·공시·리포트 기반으로 발굴.',
    keywords: '노마드 장기 발굴 그록',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'NOMAD-X',
    prompt: `GROK — 노마드 장기 투자 1차 발굴
오늘: {TODAY}

역할: 한국 상장기업 중 5~10년 장기 보유 가능한 복리형 후보를 발굴하는 1차 리서처

탐지 기준:
- 고객이 이탈하기 어려운 구조 (전환비용/반복구매/네트워크/규제 락인)
- 규모 커질수록 해자가 강해지는 사업
- 경쟁사가 모방하기 어려운 이유가 명확한 것
- 희석 없는 성장 + 경영진 자본 배분 신뢰

탐지 업종 (편향 없이 모두 포함):
반도체소재·장비, B2B SW·SaaS, 산업자동화·로봇, 의료기기·진단,
필수소비인프라, 특수화학, 방산·항공, 조선기자재, 교육플랫폼,
금융인프라, 물류/콜드체인, 이차전지소재

검색:
- X: (장기투자 OR 해자 OR 독점 OR 반복매출) lang:ko since:{YESTERDAY}
- 웹: "한국 장기투자 유망종목 {PREV_YEAR} {YEAR}"
- 공시: 최근 사업보고서·IR에서 구조적 성장 언급 기업

출력:
표A. 1차 후보 리스트 (최소 15개)
| 종목명 | 업종 | 해자 유형 | 핵심 논리 2줄 | 리스크 1줄 | X/뉴스 언급 수준 |

표B. 탐지 제외 이유 (과장·일시적·단순 실적 기업)

표C. 업종별 커버리지 점검
(소비재·플랫폼·대형주 편중 여부 자체 점검)

⚠ "무조건/독보적/절대적 해자/한국의 아마존" 표현 사용 금지
⚠ 이 결과를 ChatGPT NOMAD-C 카드에 붙여넣어 2차 정제`,
  },
  {
    code: 'NOMAD-C', engine: 'gpt', tags: ['opt'], group: 'nomad',
    title: '노마드 2단계 — ChatGPT 2차 정제',
    desc: 'Grok 1차 발굴 결과를 과장 제거·재분류·업종 편향 교정·5~10년 투자 후보 압축.',
    keywords: '노마드 장기 정제 5년',
    dep: 'NOMAD-G 결과',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: false, tasksGroup: null,
    prompt: `ChatGPT — 한국형 노마드 투자 2차 정제 v2

목적: Grok 1차 발굴 후보를 과장 제거·중복 제거·업종 편향 교정·사업-투자 구분·팩트 검증·최종 압축.

인풋: [Grok 1차 발굴 결과 붙여넣기]

핵심 원칙: 5~10년 장기 복리형 투자 후보 압축

수행 순서:
1. 중복 제거 — 같은 업종 논리 같으면 대표 1~2개만
2. 과장 제거 — "무조건/독보적/절대적 해자" 자동 감점
3. 투자 가능 상태 검증 — 한국 상장, 거래 가능, 비상장전환 아닌지
4. 최신 팩트 검증 — 희석성 증자, 거버넌스 이슈
5. 업종 편향 점검 — B2B SW, 산업자동화, 반도체소재, 의료기기 누락 여부

분류: A.핵심(최대5) / B.관찰 / C.좋은회사≠투자대상 / D.탈락

출력:
표1. 과장 제거 로그
표2. 재분류 결과 (A/B/C/D + 좋은회사/사업/투자 각각 판정)
표3. 업종 편향 점검
표4. 최종 압축 5개
표5. 탈락 로그

마지막 한 줄: 지금 깊게 볼 핵심 후보 / 보류 후보 / 탈락 후보`,
  },

  // ── X 신호 (nomad 그룹): 1장 ──
  {
    code: 'X-SIGNAL', engine: 'grok', tags: ['opt'], group: 'nomad',
    title: 'X 초동 신호 발굴',
    desc: '공식 기사보다 먼저 X(트위터) 담론에서 퍼지는 주식 초기 신호 포착.',
    keywords: 'X 초동 신호 트위터 담론',
    dep: '',
    visible: false, enabled: true, defenseLine: false,
    isTasksTarget: true, tasksGroup: 'NOMAD-X',
    prompt: `GROK — X 초동 신호 발굴 v1
오늘: {TODAY}

목표: 공식 기사보다 먼저 X 담론에서 퍼지는 초기 신호 포착

탐지 4가지:
A. 반도체/AI 밸류체인 — 기사는 적지만 X에서 먼저 도는 종목
B. 유가·중동 — 실제 공급 차질 공포 vs 헤드라인 과열 분리
C. 군중 포지셔닝 — 한쪽으로 과도하게 쏠린 테마주
D. 한국 이슈 해외 번역 — 해외 트레이더가 어떻게 해석하는지

출력:
표A. X 초동 신호 후보 (최소8개) — 종목/X담론상태/공식기사확인도/가격반응/판단
표B. 헤드라인 vs 실제 확산 판정
표C. 군중 포지셔닝 쏠림 (최소5개)
표D. 한국 이슈 해외 번역 (최소4개)
표E. 실행 압축

판단 규칙:
- 단순 언급량 증가만으로 bullish 판정 금지
- 유명 인플루언서 1~2명 발언만으로 신호 확정 금지
- 과열 내러티브엔 반대편 시나리오 필수

마지막 3줄:
1. X가 기사보다 먼저 반응하는 영역 1개
2. X 과열 가능성 최고 영역 1개
3. 가장 현실적인 군중 오판 1개`,
  },
];

// 파생 헬퍼
export const VISIBLE_CARDS = CARDS.filter(c => c.visible);
export const CARD_BY_CODE  = Object.fromEntries(CARDS.map(c => [c.code, c]));
