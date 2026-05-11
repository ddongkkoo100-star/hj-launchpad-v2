# HJ 런치패드 — Native (iOS 앱)

> hj-launchpad-v2 PWA를 **Expo React Native** iOS 앱으로 전환한 버전.

## 주요 기능

- **대시보드**: 17장 카드 그룹별 목록 (수집형/판단형/방어선), 진행률 바
- **카드 실행**: 8단계 상태 머신, 프롬프트 복사, AI 링크, 결과 저장
- **포트폴리오**: 텔레그램 리포트 파싱 → T1 카드 자동 연동
- **자료관리**: Run 목록, JSON Export, 삭제
- **설정**: 글자 크기, 5대 절대 원칙

## 기술 스택

- Expo SDK 54 + React Native 0.81
- TypeScript + NativeWind (Tailwind CSS)
- AsyncStorage (로컬 저장소)
- Expo Router (파일 기반 라우팅)

## 5대 절대 원칙 (SKILL.md 준수)

1. AI 서비스 자동 접속 금지
2. 다음 카드 자동 진행 금지
3. G1/C1/I2 방어선 자동화 금지
4. 투자 판단 자동 생성 금지
5. 이 앱은 수동 실행 도우미

## 포트폴리오 자동 연동 플로우

1. Manus 스케줄러가 매일 아침 포트폴리오 분석 실행
2. 결과를 텔레그램으로 전송 (기존 자동화 유지)
3. 앱 **포트폴리오 탭**에서 텔레그램 메시지 붙여넣기
4. 파싱 → **"T1 카드에 자동 적용"** 버튼 탭
5. T1 카드에 포트폴리오 데이터 자동 주입

## 설치 (개발)

```bash
cd native
pnpm install
pnpm dev:metro
```

Expo Go 앱에서 QR 코드 스캔하여 테스트.
