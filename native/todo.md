# HJ 런치패드 Native — TODO

## 초기 설정
- [x] 앱 로고 생성 및 적용
- [x] 다크 테마 컬러 팔레트 설정 (theme.config.js)
- [x] 탭바 아이콘 매핑 (icon-symbol.tsx)
- [x] app.config.ts 앱 이름 업데이트

## 핵심 데이터 포팅
- [x] data/cards.ts — 30카드 메타데이터 + 17카드 prompt 본문
- [x] data/deps.ts — DEPS 의존성 그래프
- [x] data/rules.ts — ABS_RULES (설정 화면에 포함)
- [x] lib/state-machine.ts — 8단계 상태 머신
- [x] lib/store.ts — AsyncStorage 기반 통합 스토어

## 대시보드 화면
- [x] 날짜 헤더 + run 상태 표시
- [x] 새 run 시작 버튼
- [x] 전체 진행률 바
- [x] 수집형 그룹 카드 목록
- [x] 판단형 그룹 카드 목록
- [x] 방어선 그룹 카드 목록 (빨간 테두리)
- [x] 카드 상태 배지 (8종)
- [x] 엔진 배지 (GROK/GPT/Claude)

## 카드 실행 화면
- [x] 카드 제목 + 상태 배지
- [x] 방어선 경고 박스 (G1/C1/I2)
- [x] 프롬프트 텍스트 표시 ({TODAY} 치환)
- [x] 프롬프트 복사 버튼
- [x] AI 링크 버튼 (Safari 열기)
- [x] 결과 입력 TextInput
- [x] 시작 / 저장 / 검토 완료 / 재실행 버튼
- [x] 의존 카드 잠김 이유 표시

## 포트폴리오 화면 (T1 자동 연동)
- [x] 포트폴리오 리포트 붙여넣기 입력
- [x] 리포트 파싱 모듈 (텔레그램 메시지 형식)
- [x] 파싱 결과 시각화 (요약 + 종목별)
- [x] "T1 카드에 자동 적용" 버튼
- [x] AsyncStorage에 최신 리포트 저장
- [x] 마지막 업데이트 시각 표시

## 자료관리 화면
- [x] 현재 run 목록
- [x] JSON Export
- [ ] JSON Import (파일 선택 미구현)
- [x] 특정 run 삭제
- [x] 전체 초기화

## 설정 화면
- [x] 글자 크기 설정 (소/중/대)
- [x] 앱 버전 정보
- [x] 5대 절대 원칙 표시

## 통합 테스트
- [x] 카드 상태 전이 로직 테스트
- [x] 포트폴리오 파싱 테스트
- [x] 전체 워크플로우 end-to-end 확인 (18개 테스트 통과)
