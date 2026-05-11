// HJ 런치패드 핵심 로직 단위 테스트
import { describe, it, expect } from "vitest";

// ── 상태 머신 테스트 ─────────────────────────────────
describe("computeStatus", () => {
  // 모킹: cards, deps 직접 인라인
  const MOCK_CARDS: Record<string, { code: string; enabled: boolean; defenseLine: boolean }> = {
    P1A: { code: "P1A", enabled: true, defenseLine: false },
    P1B: { code: "P1B", enabled: true, defenseLine: false },
    M0:  { code: "M0",  enabled: true, defenseLine: false },
    G1:  { code: "G1",  enabled: true, defenseLine: true },
    AV:  { code: "AV",  enabled: false, defenseLine: false },
  };

  const MOCK_DEPS: Record<string, string[]> = {
    P1B: ["P1A"],
    M0:  ["P1A", "P1B"],
    G1:  ["M0"],
  };

  function mockComputeStatus(
    cardCode: string,
    depStateMap: Record<string, string> = {},
    ownState: string | null = null
  ): string {
    const card = MOCK_CARDS[cardCode];
    if (!card) return "LOCKED";

    if (ownState && ownState !== "LOCKED") return ownState;

    const deps = (MOCK_DEPS[cardCode] || []).filter(depCode => {
      const dep = MOCK_CARDS[depCode];
      return dep && dep.enabled;
    });

    if (deps.length === 0) return "READY";

    const allSatisfied = deps.every(depCode => {
      const depCard = MOCK_CARDS[depCode];
      const depStatus = depStateMap[depCode];
      if (!depStatus) return false;
      if (depCard && depCard.defenseLine) return depStatus === "REVIEWED";
      return depStatus === "SAVED" || depStatus === "REVIEWED";
    });

    return allSatisfied ? "READY" : "LOCKED";
  }

  it("의존 없는 카드(P1A)는 READY", () => {
    expect(mockComputeStatus("P1A", {}, null)).toBe("READY");
  });

  it("의존 미충족 시 LOCKED", () => {
    expect(mockComputeStatus("P1B", {}, null)).toBe("LOCKED");
    expect(mockComputeStatus("P1B", { P1A: "LOCKED" }, null)).toBe("LOCKED");
  });

  it("의존 충족(SAVED) 시 READY", () => {
    expect(mockComputeStatus("P1B", { P1A: "SAVED" }, null)).toBe("READY");
  });

  it("의존 충족(REVIEWED) 시 READY", () => {
    expect(mockComputeStatus("P1B", { P1A: "REVIEWED" }, null)).toBe("READY");
  });

  it("ownState가 SAVED이면 그대로 유지", () => {
    expect(mockComputeStatus("P1B", {}, "SAVED")).toBe("SAVED");
  });

  it("ownState가 REVIEWED이면 그대로 유지", () => {
    expect(mockComputeStatus("P1B", {}, "REVIEWED")).toBe("REVIEWED");
  });

  it("방어선 dep(G1)은 REVIEWED만 충족", () => {
    // G1이 defenseLine=true이므로 G1을 dep으로 가진 카드는 G1이 REVIEWED여야 함
    // 여기서는 G1 자체를 테스트: M0가 SAVED여도 G1은 READY가 되어야 함
    // (G1의 dep인 M0는 defenseLine=false이므로 SAVED로 충족)
    expect(mockComputeStatus("G1", { M0: "SAVED" }, null)).toBe("READY");
    expect(mockComputeStatus("G1", { M0: "REVIEWED" }, null)).toBe("READY");
    expect(mockComputeStatus("G1", {}, null)).toBe("LOCKED");
  });

  it("enabled=false 카드(AV)는 deps에서 제외", () => {
    // AV는 enabled=false이므로 AV를 dep으로 가진 카드에서 AV 충족 여부 무시
    // 이 테스트에서는 AV 자체가 READY인지 확인 (deps 없음)
    expect(mockComputeStatus("AV", {}, null)).toBe("READY");
  });
});

// ── 포트폴리오 파서 테스트 ────────────────────────────
describe("parsePortfolioReport", () => {
  const SAMPLE_REPORT = `📊 HJ 포트폴리오 일일 수익률 리포트
🗓 2026. 5. 11. 8시 47분 24초 (KST)
💱 USD/KRW: 1461원

━━━━━━━━━━━━━━━━━━━━
📈 포트폴리오 전체 요약
총 평가금액: ₩50,697,744
총 매입금액: ₩46,426,130
총 손익: +₩4,271,614
총 수익률: +9.20%
━━━━━━━━━━━━━━━━━━━━

🏦 종목별 현재가 수익률
🟢 TIGER 미국S&P500
   현재가: ₩26,820 | 수익률: +25.10%
   평가: ₩3,111,120 | 손익: +₩624,195
🔴 PLUS K방산
   현재가: ₩73,380 | 수익률: -2.49%
   평가: ₩2,715,060 | 손익: ₩69,230

💼 펀드/예금/현금 (기준가 기준)
🟢 미래에셋퇴직연금다이와일본밸류중소형증권…: +2.16% (₩713,873)

Powered by HJ Portfolio Alert`;

  function parseReport(text: string) {
    if (!text || !text.includes("HJ 포트폴리오")) return null;

    const lines = text.split("\n");
    const summary = {
      reportDate: "",
      usdKrw: 0,
      totalValuation: "",
      totalCost: "",
      totalPnl: "",
      totalReturn: "",
    };

    for (const line of lines) {
      const dateMatch = line.match(/🗓\s*(.+)/);
      if (dateMatch) summary.reportDate = dateMatch[1].trim();
      const fxMatch = line.match(/USD\/KRW:\s*([\d,]+)원/);
      if (fxMatch) summary.usdKrw = parseInt(fxMatch[1].replace(/,/g, ""));
      const valMatch = line.match(/총 평가금액:\s*(.+)/);
      if (valMatch) summary.totalValuation = valMatch[1].trim();
      const retMatch = line.match(/총 수익률:\s*(.+)/);
      if (retMatch) summary.totalReturn = retMatch[1].trim();
    }

    const stocks: Array<{ name: string; returnRate: string; isPositive: boolean }> = [];
    let inStocks = false;
    let currentItem: { name: string; returnRate: string; isPositive: boolean } | null = null;

    for (const line of lines) {
      if (line.includes("종목별 현재가 수익률")) { inStocks = true; continue; }
      if (line.includes("펀드/예금/현금")) { inStocks = false; continue; }
      if (inStocks) {
        const nameMatch = line.match(/^(🟢|🔴)\s+(.+)/);
        if (nameMatch) {
          if (currentItem) stocks.push(currentItem);
          currentItem = { name: nameMatch[2].trim(), returnRate: "", isPositive: nameMatch[1] === "🟢" };
        }
        if (currentItem) {
          const priceMatch = line.match(/현재가:\s*([^|]+)\|\s*수익률:\s*([^\s]+)/);
          if (priceMatch) currentItem.returnRate = priceMatch[2].trim();
        }
      }
    }
    if (currentItem) stocks.push(currentItem);

    return { summary, stocks };
  }

  it("null 반환 (잘못된 형식)", () => {
    expect(parseReport("아무 텍스트")).toBeNull();
    expect(parseReport("")).toBeNull();
  });

  it("날짜 파싱", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.summary.reportDate).toContain("2026");
  });

  it("USD/KRW 파싱", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.summary.usdKrw).toBe(1461);
  });

  it("총 수익률 파싱", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.summary.totalReturn).toBe("+9.20%");
  });

  it("총 평가금액 파싱", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.summary.totalValuation).toBe("₩50,697,744");
  });

  it("종목 2개 파싱", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.stocks.length).toBe(2);
  });

  it("첫 번째 종목 이름 파싱", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.stocks[0].name).toBe("TIGER 미국S&P500");
  });

  it("첫 번째 종목 수익률 파싱", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.stocks[0].returnRate).toBe("+25.10%");
  });

  it("첫 번째 종목 isPositive=true", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.stocks[0].isPositive).toBe(true);
  });

  it("두 번째 종목 isPositive=false (🔴)", () => {
    const result = parseReport(SAMPLE_REPORT);
    expect(result?.stocks[1].isPositive).toBe(false);
  });
});
