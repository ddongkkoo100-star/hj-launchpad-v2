# HJ 런치패드 v2 — Claude Code SKILL

이 파일은 Claude Code가 이 프로젝트에서 코드 작성 시 반드시 먼저 확인하는 가이드다.

## 5대 절대 원칙

1. **AI 서비스 자동 접속 금지.** 어떤 모델 API에도 직접 호출하지 않는다. fetch/iframe/postMessage로 AI 페이지 자동 호출 금지.
2. **다음 카드 자동 진행 금지.** 사람이 명시적으로 클릭해야 다음 카드로 간다. setTimeout/setInterval로 자동 전이 금지.
3. **G1 / C1 / I2 방어선 자동화 금지.** 이 셋은 사용자 검토 필수. "검토 완료" 누르기 전 다음 카드 unlock 금지.
4. **투자 판단 자동 생성 금지.** 매수·매도·비중 추천 코드 작성 금지.
5. **코드 작성 전 SKILL.md 확인.** 특히 frontend-design 관련 작업은 frontend-design SKILL을 먼저 확인.

## 코드 작성 전 체크리스트

- [ ] 매뉴얼(hj_launchpad_v6_manual.html) 카드 원문 확인
- [ ] data/cards.js, data/deps.js, data/rules.js 변경은 사용자 합의 필수
- [ ] src/state-machine.js 변경은 사용자 합의 필수
- [ ] 파일 수정 전 view 도구로 먼저 읽기
- [ ] 신규 파일 생성 시 폴더 구조(README.md) 준수

## UI 가이드라인

- 다크 테마 유지 (style.css 기존 변수 사용)
- 방어선 카드(G1/C1/I2): 빨간 보더 + "방어선" 배지 + 상단 경고 박스
- 8상태 배지 색 규약 (Step 2 확정):
  - LOCKED, READY, RUNNING, PASTED, SAVED, REVIEWED, MISSING, WARNING
- 카드 화면 버튼: 시작 / 저장 / 검토 / 재실행 (Step 2 확정)

## 작업 방식

- 한 번에 다 만들지 않는다. 단계별로 작업하고 매 단계마다 사용자 확인.
- 매 작업 단위 끝에 git commit + 사용자에게 검증 요청.
- 파일 수정 전 view로 먼저 읽고, 그 후 str_replace 또는 create_file.
- 검증 통과 전에 다음 단계로 넘어가지 않는다.

## 금지 사항

- AI API 직접 호출 코드 작성 금지 (fetch to api.openai.com, api.anthropic.com 등)
- 자동 진행 코드 금지 (setTimeout으로 다음 카드 자동 이동)
- localStorage / sessionStorage 사용 금지 — 데이터는 IndexedDB만 사용
- 빌드 도구(webpack/vite/rollup) 도입 금지 — Vanilla JS ES Modules 유지
- 외부 npm 패키지 추가 금지 (사용자 합의 없이)

## 기술 스택 고정

- Vanilla JS (ES Modules), 빌드 단계 없음
- IndexedDB (DB명: hj-launchpad-v2, **v2** — Step 6에서 settings store 추가)
- Service Worker + manifest.json (PWA, network-first 캐싱 — Step 6)
- 호스팅: GitHub Pages (main 브랜치 root 직배포)
- 타겟: Galaxy + Chrome 단일

## 데이터 모델 (Step 2~6 확정, 변경 시 사용자 합의)

- runs (PK: runId="run-YYYYMMDD-HHmm")
- cardStates (PK: id="${runId}::${cardCode}")
- results (PK: id="${runId}::${cardCode}")
- settings (PK: key, value) — Step 6 추가, 사용자 환경 설정 (글자 크기 등)
