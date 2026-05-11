import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as store from "@/lib/store";
import { STATUS } from "@/lib/state-machine";
import {
  parsePortfolioReport,
  buildT1PortfolioSection,
  injectPortfolioIntoT1Prompt,
  ParsedPortfolio,
  StockItem,
  FundItem,
} from "@/lib/portfolio-parser";
import { CARD_BY_CODE } from "@/data/cards";

export default function PortfolioScreen() {
  const colors = useColors();
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedPortfolio | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  // 저장된 리포트 로드
  useEffect(() => {
    store.loadPortfolioReport().then(data => {
      if (data) {
        setRawText(data.report);
        setSavedAt(data.savedAt);
        const p = parsePortfolioReport(data.report);
        if (p) setParsed(p);
      }
    });
  }, []);

  const handleParse = useCallback(() => {
    const text = rawText.trim();
    if (!text) {
      Alert.alert("입력 필요", "텔레그램에서 받은 포트폴리오 리포트를 붙여넣어 주세요.");
      return;
    }
    const result = parsePortfolioReport(text);
    if (!result) {
      Alert.alert("파싱 실패", "HJ 포트폴리오 리포트 형식이 아닙니다.\n텔레그램 메시지를 그대로 붙여넣어 주세요.");
      return;
    }
    setParsed(result);
    store.savePortfolioReport(text).then(() => setSavedAt(Date.now()));
  }, [rawText]);

  const handleApplyToT1 = useCallback(async () => {
    if (!parsed) return;

    const activeRun = store.getActiveRun();
    if (!activeRun) {
      Alert.alert("Run 없음", "대시보드에서 먼저 새 Run을 시작해주세요.");
      return;
    }

    const t1Status = store.getCardStatus("T1");
    if (t1Status === STATUS.LOCKED) {
      Alert.alert(
        "T1 카드 잠김",
        "T1 카드의 의존 카드(M0, M3, D1, P2, P3)가 아직 완료되지 않았습니다.\n포트폴리오 데이터는 저장되었으며, T1 카드가 준비되면 자동으로 반영됩니다.",
        [{ text: "확인" }]
      );
      // 저장만 하고 리턴 (나중에 T1 카드 열 때 자동 주입)
      await store.savePortfolioReport(rawText);
      return;
    }

    setApplying(true);
    try {
      const t1Card = CARD_BY_CODE["T1"];
      if (!t1Card) throw new Error("T1 카드를 찾을 수 없습니다.");

      const portfolioSection = buildT1PortfolioSection(parsed);
      const injectedPrompt = injectPortfolioIntoT1Prompt(t1Card.prompt, portfolioSection);

      // T1 카드를 RUNNING 상태로 전환 후 포트폴리오 데이터를 result로 저장
      if (t1Status === STATUS.READY) {
        await store.actionStart("T1");
      }

      // 포트폴리오 섹션을 T1 result payload로 저장
      const result = await store.actionSave("T1", portfolioSection, "portfolio_auto");
      if (result.ok) {
        setApplied(true);
        setTimeout(() => setApplied(false), 3000);
        Alert.alert(
          "✅ 적용 완료",
          "포트폴리오 데이터가 T1 카드에 자동으로 적용되었습니다.\n대시보드에서 T1 카드를 확인해주세요.",
          [{ text: "확인" }]
        );
      }
    } catch (e: any) {
      Alert.alert("오류", e.message || "T1 카드 적용에 실패했습니다.");
    } finally {
      setApplying(false);
    }
  }, [parsed, rawText]);

  const renderStock = ({ item }: { item: StockItem }) => (
    <View style={[styles.stockItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.stockLeft}>
        <Text style={[styles.stockName, { color: colors.foreground }]}>
          {item.emoji} {item.name}
        </Text>
        <Text style={[styles.stockPrice, { color: colors.muted }]}>{item.currentPrice}</Text>
      </View>
      <View style={styles.stockRight}>
        <Text
          style={[
            styles.stockReturn,
            { color: item.isPositive ? colors.success : colors.error },
          ]}
        >
          {item.returnRate}
        </Text>
        <Text style={[styles.stockPnl, { color: colors.muted }]}>{item.pnl}</Text>
      </View>
    </View>
  );

  const renderFund = ({ item }: { item: FundItem }) => (
    <View style={[styles.fundItem, { borderColor: colors.border }]}>
      <Text style={[styles.fundName, { color: colors.muted }]} numberOfLines={1}>
        {item.emoji} {item.name}
      </Text>
      <Text
        style={[
          styles.fundReturn,
          { color: item.isPositive ? colors.success : colors.error },
        ]}
      >
        {item.returnRate}
      </Text>
    </View>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>포트폴리오</Text>
        {savedAt && (
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            마지막 업데이트: {new Date(savedAt).toLocaleString("ko-KR")}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 입력 섹션 */}
        <View style={[styles.inputSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            텔레그램 리포트 붙여넣기
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            value={rawText}
            onChangeText={setRawText}
            multiline
            placeholder="텔레그램에서 받은 포트폴리오 리포트를 여기에 붙여넣으세요..."
            placeholderTextColor={colors.muted}
            textAlignVertical="top"
          />
          <Pressable
            onPress={handleParse}
            style={({ pressed }) => [
              styles.parseBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.parseBtnText, { color: colors.background }]}>
              📊 파싱 및 저장
            </Text>
          </Pressable>
        </View>

        {/* 파싱 결과 */}
        {parsed && (
          <>
            {/* 요약 카드 */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryDate, { color: colors.muted }]}>
                {parsed.summary.reportDate}
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>총 평가금액</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    {parsed.summary.totalValuation}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>총 수익률</Text>
                  <Text
                    style={[
                      styles.summaryReturn,
                      {
                        color: parsed.summary.totalReturn.startsWith("+")
                          ? colors.success
                          : colors.error,
                      },
                    ]}
                  >
                    {parsed.summary.totalReturn}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>총 손익</Text>
                  <Text
                    style={[
                      styles.summaryPnl,
                      {
                        color: parsed.summary.totalPnl.startsWith("+")
                          ? colors.success
                          : colors.error,
                      },
                    ]}
                  >
                    {parsed.summary.totalPnl}
                  </Text>
                </View>
              </View>
              <Text style={[styles.fxRate, { color: colors.muted }]}>
                USD/KRW: {parsed.summary.usdKrw.toLocaleString()}원
              </Text>
            </View>

            {/* T1 자동 적용 버튼 */}
            <Pressable
              onPress={handleApplyToT1}
              disabled={applying}
              style={({ pressed }) => [
                styles.applyBtn,
                {
                  backgroundColor: applied
                    ? colors.success
                    : applying
                    ? colors.muted
                    : colors.primary + "22",
                  borderColor: applied ? colors.success : colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.applyBtnText,
                  { color: applied ? "#fff" : colors.primary },
                ]}
              >
                {applied
                  ? "✅ T1 카드 적용 완료!"
                  : applying
                  ? "적용 중..."
                  : "🎯 T1 카드에 자동 적용"}
              </Text>
              {!applied && !applying && (
                <Text style={[styles.applyBtnSub, { color: colors.muted }]}>
                  포트폴리오 데이터를 T1 Thesis 헬스체크 카드에 주입
                </Text>
              )}
            </Pressable>

            {/* 종목별 */}
            <View style={[styles.stockSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                종목별 수익률 ({parsed.stocks.length}개)
              </Text>
              {parsed.stocks.map((stock, i) => (
                <View
                  key={i}
                  style={[styles.stockItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <View style={styles.stockLeft}>
                    <Text style={[styles.stockName, { color: colors.foreground }]}>
                      {stock.emoji} {stock.name}
                    </Text>
                    <Text style={[styles.stockPrice, { color: colors.muted }]}>{stock.currentPrice}</Text>
                  </View>
                  <View style={styles.stockRight}>
                    <Text
                      style={[
                        styles.stockReturn,
                        { color: stock.isPositive ? colors.success : colors.error },
                      ]}
                    >
                      {stock.returnRate}
                    </Text>
                    <Text style={[styles.stockPnl, { color: colors.muted }]}>{stock.pnl}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 펀드/예금 */}
            {parsed.funds.length > 0 && (
              <View style={[styles.fundSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  펀드/예금 ({parsed.funds.length}개)
                </Text>
                {parsed.funds.map((fund, i) => (
                  <View key={i} style={[styles.fundItem, { borderColor: colors.border }]}>
                    <Text style={[styles.fundName, { color: colors.muted }]} numberOfLines={1}>
                      {fund.emoji} {fund.name}
                    </Text>
                    <Text
                      style={[
                        styles.fundReturn,
                        { color: fund.isPositive ? colors.success : colors.error },
                      ]}
                    >
                      {fund.returnRate}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 11,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  inputSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    minHeight: 120,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  parseBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  parseBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  summaryDate: {
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  summaryReturn: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryPnl: {
    fontSize: 13,
    fontWeight: "700",
  },
  summaryDivider: {
    width: 1,
    height: 36,
  },
  fxRate: {
    fontSize: 11,
    textAlign: "right",
  },
  applyBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  applyBtnSub: {
    fontSize: 12,
  },
  stockSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  stockItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  stockLeft: {
    flex: 1,
    gap: 2,
  },
  stockName: {
    fontSize: 13,
    fontWeight: "600",
  },
  stockPrice: {
    fontSize: 11,
  },
  stockRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  stockReturn: {
    fontSize: 15,
    fontWeight: "700",
  },
  stockPnl: {
    fontSize: 11,
  },
  fundSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  fundItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
  },
  fundName: {
    flex: 1,
    fontSize: 12,
    marginRight: 8,
  },
  fundReturn: {
    fontSize: 13,
    fontWeight: "700",
  },
});
