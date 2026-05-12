// 앱 전체에서 사용하는 공유 타입 정의

export interface Sentence {
  id: string;
  en: string;       // 영어 원문
  ko: string;       // 한국어 번역
}

export interface ScanSession {
  id: string;
  title: string;
  createdAt: string;
  imageUri?: string;   // 촬영한 책 이미지 URI (썸네일용)
  sentences: Sentence[];
  lastPosition: number; // 마지막으로 학습한 문장 인덱스
}

export type SpeedOption = 0.5 | 0.75 | 1.0 | 1.25 | 1.5;

export type LearningMode = "auto" | "manual";
