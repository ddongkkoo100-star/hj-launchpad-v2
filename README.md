# HJ 런치패드 v2

> 한국 개인투자자의 매일 아침 시장 브리핑 워크플로우를 도와주는 **수동 실행 도우미**.
> 카드 안내 · 프롬프트 조립 · 결과 저장만 하고, **판단은 사람이 한다**.

---

## 정체성

이 앱은 **수동 실행 도우미**다. AI 자동화 도구가 아니다.

앱이 하는 것:
- 17장의 카드 데이터를 보관·표시
- 의존 카드 결과를 합쳐 generated 프롬프트를 조립
- 사용자가 AI에 직접 실행해 받아온 결과를 카드 슬롯에 저장
- Grok Tasks 결과의 마커 기반 일괄 분배
- 진행률·누락·방어선 카드 시각화

앱이 절대 하지 않는 것 — **5대 절대 원칙**:
1. **AI 서비스 자동 접속 금지**. 어떤 모델 API에도 직접 호출하지 않는다.
2. **다음 카드 자동 진행 금지**. 사람이 명시적으로 눌러야 다음 카드로 간다.
3. **G1 / C1 / I2 방어선 자동화 금지**. 이 셋은 HJ 투자 판단의 마지막 방어선이다.
4. **투자 판단 자동 생성 금지**. 앱은 어떤 매수·매도·비중 추천도 만들지 않는다.
5. **코드 작성 전 SKILL.md 확인**. 특히 frontend-design 관련 작업은 frontend-design SKILL을 반드시 먼저 확인한다.

---

## 기술 스택

- Vanilla JS (ES Modules) — **빌드 단계 없음**
- IndexedDB + JSON Export/Import (Step 2~6)
- Service Worker + manifest.json (PWA)
- 호스팅: GitHub Pages (`ddongkkoo100-star/hj-launchpad-v2`, `main` 브랜치 / root 직배포)
- 타겟: Galaxy + Chrome 단일 (iOS Safari 미지원 OK)

---

## 폴더 구조

```
hj-launchpad-v2/
├── index.html              앱 셸 (헤더 + view-root + 하단 탭바)
├── manifest.json           PWA 매니페스트 (이름·아이콘·테마컬러)
├── sw.js                   Service Worker (Step 1: 골격 / Step 6: 캐싱)
├── style.css               다크 테마 + 카드 리스트 + 탭바 스타일
├── app.js                  진입점. SW 등록 + 라우터 시작 + 데이터 점검 로그
├── data/
│   ├── cards.js            30카드 메타데이터 + 17카드 prompt 본문
│   ├── deps.js             DEPS 의존성 그래프 (30카드 전체 보관)
│   └── rules.js            ABS_RULES / EXEC_RULES / REVIEW_RULES (R-01~R-10)
├── src/
│   ├── router.js           hash 라우터 (#/, #/card/:code, #/import, #/data, #/settings)
│   ├── prompt.js           buildGenerated() — DEPS 기반 프롬프트 합성
│   └── views/
│       ├── dashboard.js    카드 17장 리스트 + 그룹 헤더 (Step 5에서 진행률 추가)
│       ├── card.js         카드 실행 화면 (Step 1: placeholder / Step 3: 본격)
│       ├── import.js       Tasks Import (Step 4)
│       ├── data.js         자료관리 (Step 6)
│       └── settings.js     설정
├── assets/
│   ├── icon.svg            원본 SVG (수정·재생성용)
│   ├── icon-192.png        PWA 192x192 아이콘
│   └── icon-512.png        PWA 512x512 아이콘
├── hj_launchpad_v6_manual.html  (참조용 — 카드 원문 매뉴얼)
└── README.md
```

---

## 로컬 실행법

### 1) 정적 서버 띄우기

Service Worker와 ES 모듈은 `file://`에서 동작하지 않는다. 반드시 `http://`로 띄운다.

PowerShell 또는 bash:

```bash
cd C:\Users\dorty\hj-launchpad-v2
python -m http.server 8000
```

> Python이 없으면 `npx serve .` 또는 VS Code "Live Server" 확장도 가능.

### 2) PC Chrome에서 접속

`http://localhost:8000` 접속.

F12 콘솔에서 데이터 점검 로그 확인:
- `전체 카드: 30`
- `visible 카드: 17`
- `enabled=false: ['AV','I3']`
- `defenseLine=true: ['G1','C1','I2']`
- `isTasksTarget=true: ['P1A','P1B','P2','P3','D1','N0']`

---

## Galaxy 테스트법

### 1) PC와 Galaxy를 같은 Wi-Fi에 연결

### 2) PC IP 확인

PowerShell:

```powershell
ipconfig
```

출력에서 `IPv4 Address` 항목 (예: `192.168.0.42`).

### 3) Galaxy Chrome에서 접속

주소창에 `http://192.168.0.42:8000` 입력 (위에서 확인한 IP).

### 4) 홈 화면에 추가

Chrome 우상단 ⋮ → **"홈 화면에 추가"**.
- 아이콘 이름: `런치패드`
- 추가된 아이콘 탭 → 풀스크린(`display: standalone`)으로 앱 열림

### 5) (선택) 원격 디버깅

Galaxy를 USB로 PC에 연결.
PC Chrome에서 `chrome://inspect/#devices` 접속.
Galaxy의 Chrome 탭이 보이면 `Inspect` 클릭해 콘솔·DOM 확인 가능.

---

## 작업 분담

| 역할 | 담당 |
|---|---|
| **의사결정·기획·설계 검수** | Claude.ai 프로젝트 (사용자가 직접 운영) |
| **코드 작성·파일 수정** | Claude Code (이 저장소 안에서 작동) |

**원칙**:
- 의사결정은 항상 Claude.ai 프로젝트에서 먼저 정렬한 뒤, 그 결과를 Claude Code에 지시한다.
- Claude Code는 단계별로 작업하고 매 단계마다 사용자 확인을 받는다.
- 한 번에 다 만들지 않는다.

---

## 카드 구조 요약

총 17장 (Phase 1-A에서 prompt 본문 이식 완료):

### 수집형 6장 (Grok Tasks 자동 실행 대상)
- **P1A** 매크로 헤드라인 (COLLECT-1)
- **P1B** 섹터/모멘텀 (COLLECT-1)
- **P2** 커뮤니티 스캐너 (COLLECT-2)
- **P3** X 트렌드/핫픽 (COLLECT-2)
- **D1** 공식 데이터 보강 (COLLECT-3)
- **N0** 뉴스 신뢰도 후보 (COLLECT-3)

### 판단형 11장 (사람이 AI에 직접 실행)
- **M0** 레짐 분류
- **M1** 이상치 스캔
- **M2** 섹터 체인맵
- **M3** 후보 점수화
- **T1** 보유 포지션 헬스체크
- **V1** Alpha Validator
- **P0** 액션 플랜 (포트 브리지)
- **G1** 종합 시장 브리핑 ← 🛡 방어선
- **C1** 최종 HTML 보고서 ← 🛡 방어선
- **I2** Thesis Breaker ← 🛡 방어선
- **R1** 다음날 복기

### Phase 1-B 대상 (visible=false): 13장
- 영구 제외 (enabled=false): AV, I3
- v0.2+ 부활 후보: L-SUP, L-EVT, Q1, S1, M0-전환
- 단타: DT-P1A, DT-P1B, DT-P2, DT-P3
- 노마드 / X신호: NOMAD-G, NOMAD-C, X-SIGNAL

---

## 진행 상태 (Step 1)

- [x] 폴더 구조 + 빈 파일들
- [x] manifest.json + sw.js 골격
- [x] index.html 셸 + style.css 다크 테마
- [x] router.js + 5개 view placeholder
- [x] data/cards.js — Phase 1-A 17카드 prompt 본문 이식
- [x] data/deps.js + data/rules.js
- [x] 아이콘 (svg + 192/512 PNG)
- [x] README.md
- [ ] **Phase 1-A 검수** ← 사용자 진행 중

다음 단계: 검수 통과 후 Phase 1-B (visible=false 13카드 prompt 본문 이식).
