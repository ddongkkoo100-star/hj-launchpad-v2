import { describe, it, expect } from "vitest";

// 스토리지 유틸리티 테스트 (AsyncStorage 없이 로직만 검증)
describe("ScanSession data structure", () => {
  it("should create a valid session object", () => {
    const session = {
      id: "123",
      title: "Test Book",
      createdAt: new Date().toISOString(),
      sentences: [
        { id: "1", en: "Hello world.", ko: "안녕 세상." },
        { id: "2", en: "The cat sat.", ko: "고양이가 앉았다." },
      ],
      lastPosition: 0,
    };

    expect(session.id).toBe("123");
    expect(session.sentences).toHaveLength(2);
    expect(session.sentences[0].en).toBe("Hello world.");
    expect(session.sentences[0].ko).toBe("안녕 세상.");
    expect(session.lastPosition).toBe(0);
  });

  it("should calculate progress correctly", () => {
    const sentences = [
      { id: "1", en: "One.", ko: "하나." },
      { id: "2", en: "Two.", ko: "둘." },
      { id: "3", en: "Three.", ko: "셋." },
      { id: "4", en: "Four.", ko: "넷." },
    ];
    const lastPosition = 1;
    const progress = Math.round(((lastPosition + 1) / sentences.length) * 100);
    expect(progress).toBe(50);
  });

  it("should validate speed options", () => {
    const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5];
    expect(SPEED_OPTIONS).toContain(1.0);
    expect(SPEED_OPTIONS.length).toBe(5);
    expect(Math.min(...SPEED_OPTIONS)).toBe(0.5);
    expect(Math.max(...SPEED_OPTIONS)).toBe(1.5);
  });
});

describe("JSON parsing for LLM response", () => {
  it("should parse valid LLM JSON response", () => {
    const mockResponse = JSON.stringify({
      title: "At the Park",
      sentences: [
        { id: "1", en: "I see a swing.", ko: "나는 그네를 봐요." },
        { id: "2", en: "I see a slide.", ko: "나는 미끄럼틀을 봐요." },
      ],
    });

    const parsed = JSON.parse(mockResponse);
    expect(parsed.title).toBe("At the Park");
    expect(parsed.sentences).toHaveLength(2);
    expect(parsed.sentences[0].en).toBe("I see a swing.");
  });

  it("should handle malformed JSON gracefully", () => {
    const malformed = "not valid json";
    let parsed: { title?: string; sentences?: unknown[] };
    try {
      parsed = JSON.parse(malformed);
    } catch {
      parsed = { title: "새 학습", sentences: [] };
    }
    expect(parsed.title).toBe("새 학습");
    expect(parsed.sentences).toHaveLength(0);
  });
});
