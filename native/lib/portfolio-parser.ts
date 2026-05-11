// 포트폴리오 리포트 파서
// 텔레그램으로 받는 "HJ 포트폴리오 일일 수익률 리포트" 형식을 파싱한다.

export interface PortfolioSummary {
  reportDate: string;
  usdKrw: number;
  totalValuation: string;
  totalCost: string;
  totalPnl: string;
  totalReturn: string;
}

export interface StockItem {
  emoji: string;       // 🟢 or 🔴
  name: string;
  currentPrice: string;
  returnRate: string;
  valuation: string;
  pnl: string;
  isPositive: boolean;
}

export interface FundItem {
  emoji: string;
  name: string;
  returnRate: string;
  valuation: string;
  isPositive: boolean;
}

export interface ParsedPortfolio {
  summary: PortfolioSummary;
  stocks: StockItem[];
  funds: FundItem[];
  rawText: string;
  parsedAt: number;
}

/**
 * 텔레그램 포트폴리오 메시지 파싱
 */
export function parsePortfolioReport(text: string): ParsedPortfolio | null {
  if (!text || !text.includes('HJ 포트폴리오')) return null;

  const lines = text.split('\n');
  
  // ── 요약 파싱 ─────────────────────────────────────
  const summary: PortfolioSummary = {
    reportDate: '',
    usdKrw: 0,
    totalValuation: '',
    totalCost: '',
    totalPnl: '',
    totalReturn: '',
  };

  for (const line of lines) {
    // 날짜: 🗓 2026. 5. 11. 8시 47분 24초 (KST)
    const dateMatch = line.match(/🗓\s*(.+)/);
    if (dateMatch) summary.reportDate = dateMatch[1].trim();

    // 환율: 💱 USD/KRW: 1461원
    const fxMatch = line.match(/USD\/KRW:\s*([\d,]+)원/);
    if (fxMatch) summary.usdKrw = parseInt(fxMatch[1].replace(/,/g, ''));

    // 총 평가금액
    const valMatch = line.match(/총 평가금액:\s*(.+)/);
    if (valMatch) summary.totalValuation = valMatch[1].trim();

    // 총 매입금액
    const costMatch = line.match(/총 매입금액:\s*(.+)/);
    if (costMatch) summary.totalCost = costMatch[1].trim();

    // 총 손익
    const pnlMatch = line.match(/총 손익:\s*(.+)/);
    if (pnlMatch) summary.totalPnl = pnlMatch[1].trim();

    // 총 수익률
    const retMatch = line.match(/총 수익률:\s*(.+)/);
    if (retMatch) summary.totalReturn = retMatch[1].trim();
  }

  // ── 종목별 파싱 ────────────────────────────────────
  const stocks: StockItem[] = [];
  const funds: FundItem[] = [];

  let inStocks = false;
  let inFunds = false;
  let currentItem: Partial<StockItem> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('종목별 현재가 수익률')) {
      inStocks = true;
      inFunds = false;
      continue;
    }
    if (line.includes('펀드/예금/현금')) {
      inStocks = false;
      inFunds = true;
      continue;
    }
    if (line.includes('Powered by')) {
      inStocks = false;
      inFunds = false;
      continue;
    }

    if (inStocks) {
      // 종목 시작: 🟢 TIGER 미국S&P500 or 🔴 PLUS K방산
      const nameMatch = line.match(/^(🟢|🔴)\s+(.+)/);
      if (nameMatch) {
        if (currentItem && currentItem.name) {
          stocks.push(currentItem as StockItem);
        }
        currentItem = {
          emoji: nameMatch[1],
          name: nameMatch[2].trim(),
          isPositive: nameMatch[1] === '🟢',
          currentPrice: '',
          returnRate: '',
          valuation: '',
          pnl: '',
        };
        continue;
      }

      if (currentItem) {
        // 현재가 라인: 현재가: ₩26,820 | 수익률: +25.10%
        const priceMatch = line.match(/현재가:\s*([^|]+)\|\s*수익률:\s*([^\s]+)/);
        if (priceMatch) {
          currentItem.currentPrice = priceMatch[1].trim();
          currentItem.returnRate = priceMatch[2].trim();
        }
        // 평가 라인: 평가: ₩3,111,120 | 손익: +₩624,195
        const evalMatch = line.match(/평가:\s*([^|]+)\|\s*손익:\s*(.+)/);
        if (evalMatch) {
          currentItem.valuation = evalMatch[1].trim();
          currentItem.pnl = evalMatch[2].trim();
        }
      }
    }

    if (inFunds) {
      // 펀드 라인: 🟢 미래에셋퇴직연금...: +2.16% (₩713,873)
      const fundMatch = line.match(/^(🟢|🔴)\s+(.+?):\s*([+-][\d.]+%)\s*\((.+)\)/);
      if (fundMatch) {
        funds.push({
          emoji: fundMatch[1],
          name: fundMatch[2].trim(),
          returnRate: fundMatch[3].trim(),
          valuation: fundMatch[4].trim(),
          isPositive: fundMatch[1] === '🟢',
        });
      }
    }
  }

  // 마지막 종목 추가
  if (currentItem && currentItem.name) {
    stocks.push(currentItem as StockItem);
  }

  return {
    summary,
    stocks,
    funds,
    rawText: text,
    parsedAt: Date.now(),
  };
}

/**
 * 파싱된 포트폴리오를 T1 카드 프롬프트의 [보유 포트 입력] 섹션에 삽입할 텍스트로 변환
 */
export function buildT1PortfolioSection(parsed: ParsedPortfolio): string {
  const lines: string[] = [];
  
  lines.push(`포트폴리오 기준일: ${parsed.summary.reportDate}`);
  lines.push(`USD/KRW: ${parsed.summary.usdKrw}원`);
  lines.push(`총 평가금액: ${parsed.summary.totalValuation} (수익률: ${parsed.summary.totalReturn})`);
  lines.push('');
  lines.push('── 보유 종목 ──');
  
  for (const stock of parsed.stocks) {
    const sign = stock.isPositive ? '🟢' : '🔴';
    lines.push(`${sign} ${stock.name}: ${stock.returnRate} | 평가 ${stock.valuation} | 손익 ${stock.pnl}`);
  }
  
  if (parsed.funds.length > 0) {
    lines.push('');
    lines.push('── 펀드/예금 ──');
    for (const fund of parsed.funds) {
      const sign = fund.isPositive ? '🟢' : '🔴';
      lines.push(`${sign} ${fund.name}: ${fund.returnRate} (${fund.valuation})`);
    }
  }

  return lines.join('\n');
}

/**
 * T1 카드 프롬프트의 [보유 포트 입력 (수동)] 섹션을 포트폴리오 데이터로 교체
 */
export function injectPortfolioIntoT1Prompt(
  originalPrompt: string,
  portfolioSection: string
): string {
  const PLACEHOLDER_START = '[여기에 보유 자산 + 각 thesis 붙여넣기]';
  const PLACEHOLDER_END_MARKER = '──────────────────────────────────────\n[판정 3단계]';
  
  // [보유 포트 입력 (수동)] 섹션 찾아서 교체
  const sectionStart = originalPrompt.indexOf('[보유 포트 입력 (수동)]');
  const sectionEnd = originalPrompt.indexOf('[판정 3단계]');
  
  if (sectionStart === -1 || sectionEnd === -1) {
    // 섹션을 찾지 못하면 프롬프트 앞에 포트폴리오 데이터 추가
    return `[자동 주입된 포트폴리오 데이터]\n${portfolioSection}\n\n${originalPrompt}`;
  }
  
  const before = originalPrompt.substring(0, sectionStart);
  const after = originalPrompt.substring(sectionEnd);
  
  return `${before}[보유 포트 입력 — 자동 주입 ${new Date().toLocaleDateString('ko-KR')}]\n──────────────────────────────────────\n${portfolioSection}\n──────────────────────────────────────\n${after}`;
}
