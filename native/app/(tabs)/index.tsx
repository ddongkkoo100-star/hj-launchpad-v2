import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useStore } from "@/hooks/use-store";
import * as store from "@/lib/store";
import { STATUS, STATUS_META, CardStatus } from "@/lib/state-machine";
import { VISIBLE_CARDS, Card } from "@/data/cards";

// ── 그룹 정의 ──────────────────────────────────────────
const GROUPS = [
  { key: "collect", label: "수집형", sub: "Tasks 자동 수집 대상", accentKey: "grok" },
  { key: "judge",   label: "판단형", sub: "사람이 직접 실행",    accentKey: "primary" },
  { key: "defense", label: "방어선", sub: "사용자 검토 필수",    accentKey: "error" },
] as const;

function classifyGroup(card: Card): "collect" | "judge" | "defense" {
  if (card.defenseLine) return "defense";
  if (card.group === "collect") return "collect";
  return "judge";
}

// ── 진행률 계산 ────────────────────────────────────────
function calcProgress(cards: Card[], getStatus: (code: string) => CardStatus | null) {
  let done = 0;
  let total = cards.length;
  for (const c of cards) {
    const s = getStatus(c.code);
    if (s === STATUS.SAVED || s === STATUS.REVIEWED) done++;
  }
  return { done, total, pct: total > 0 ? (done / total) * 100 : 0 };
}

// ── 상태 배지 컴포넌트 ─────────────────────────────────
function StatusBadge({ status }: { status: CardStatus | null }) {
  const colors = useColors();
  const s = status || STATUS.LOCKED;
  const meta = STATUS_META[s];
  return (
    <View style={[styles.badge, { backgroundColor: meta.color + "22", borderColor: meta.color + "66" }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>
        {meta.icon} {meta.label}
      </Text>
    </View>
  );
}

// ── 엔진 배지 ─────────────────────────────────────────
function EngineBadge({ engine }: { engine: string }) {
  const colors = useColors();
  const engineColors: Record<string, string> = {
    grok: colors.grok,
    gpt: colors.gpt,
    claude: colors.claude,
  };
  const color = engineColors[engine] || colors.muted;
  return (
    <View style={[styles.engineBadge, { borderColor: color + "66" }]}>
      <Text style={[styles.engineText, { color }]}>{engine.toUpperCase()}</Text>
    </View>
  );
}

// ── 카드 아이템 ────────────────────────────────────────
function CardItem({
  card,
  status,
  isNext,
  onPress,
}: {
  card: Card;
  status: CardStatus | null;
  isNext: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const isDefense = card.defenseLine;
  const isLocked = !status || status === STATUS.LOCKED;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardItem,
        {
          backgroundColor: colors.surface,
          borderColor: isDefense
            ? colors.error + "88"
            : isNext
            ? colors.primary + "44"
            : colors.border,
          borderWidth: isDefense ? 1.5 : isNext ? 1.5 : 1,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.cardLeft}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardCode, { color: colors.primary }]}>{card.code}</Text>
          {isDefense && (
            <Text style={[styles.defenseBadge, { color: colors.error }]}>🛡 방어선</Text>
          )}
          {isNext && !isDefense && (
            <Text style={[styles.nextBadge, { color: colors.primary }]}>▶ 다음</Text>
          )}
        </View>
        <Text
          style={[styles.cardTitle, { color: isLocked ? colors.muted : colors.foreground }]}
          numberOfLines={1}
        >
          {card.title.replace(/^[A-Z0-9-]+ — /, "")}
        </Text>
        <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={1}>
          {card.desc}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <StatusBadge status={status} />
        <EngineBadge engine={card.engine} />
      </View>
    </Pressable>
  );
}

// ── 그룹 섹션 헤더 ─────────────────────────────────────
function GroupHeader({
  label,
  sub,
  done,
  total,
  accentColor,
}: {
  label: string;
  sub: string;
  done: number;
  total: number;
  accentColor: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.groupHeader, { borderLeftColor: accentColor }]}>
      <View style={styles.groupHeaderLeft}>
        <Text style={[styles.groupLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.groupSub, { color: colors.muted }]}>{sub}</Text>
      </View>
      <Text style={[styles.groupProgress, { color: accentColor }]}>
        {done}/{total}
      </Text>
    </View>
  );
}

// ── 메인 대시보드 ──────────────────────────────────────
export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeRun, getCardStatus } = useStore();
  const [loading, setLoading] = useState(false);

  const handleStartRun = useCallback(async () => {
    setLoading(true);
    try {
      await store.startNewRun();
    } catch (e) {
      Alert.alert("오류", "Run 시작에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 전체 진행률
  const { done, total, pct } = calcProgress(VISIBLE_CARDS, getCardStatus);

  // 그룹별 카드 분류
  const grouped = {
    collect: VISIBLE_CARDS.filter(c => classifyGroup(c) === "collect"),
    judge:   VISIBLE_CARDS.filter(c => classifyGroup(c) === "judge"),
    defense: VISIBLE_CARDS.filter(c => classifyGroup(c) === "defense"),
  };

  // 다음 실행할 카드 (READY 상태 중 첫 번째)
  const nextCard = VISIBLE_CARDS.find(c => getCardStatus(c.code) === STATUS.READY);

  // FlatList 데이터 구성 (그룹 헤더 + 카드 아이템 혼합)
  type ListItem =
    | { type: "header"; group: typeof GROUPS[number]; cards: Card[] }
    | { type: "card"; card: Card };

  const listData: ListItem[] = [];
  for (const group of GROUPS) {
    const cards = grouped[group.key];
    if (cards.length === 0) continue;
    listData.push({ type: "header", group, cards });
    for (const card of cards) {
      listData.push({ type: "card", card });
    }
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      const { done: gDone } = calcProgress(item.cards, getCardStatus);
      const accentColor =
        item.group.key === "defense"
          ? colors.error
          : item.group.key === "collect"
          ? colors.grok
          : colors.primary;
      return (
        <GroupHeader
          label={item.group.label}
          sub={item.group.sub}
          done={gDone}
          total={item.cards.length}
          accentColor={accentColor}
        />
      );
    }
    const { card } = item;
    const status = getCardStatus(card.code);
    const isNext = nextCard?.code === card.code;
    return (
      <CardItem
        card={card}
        status={status}
        isNext={isNext}
        onPress={() => router.push({ pathname: '/card/[code]', params: { code: card.code } })}
      />
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>HJ 런치패드</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {new Date().toLocaleDateString("ko-KR", {
              year: "numeric", month: "long", day: "numeric", weekday: "short",
            })}
          </Text>
        </View>
        <View style={[styles.versionChip, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.versionText, { color: colors.primary }]}>v0.1</Text>
        </View>
      </View>

      {/* Run 없을 때 시작 버튼 */}
      {!activeRun ? (
        <View style={styles.noRunContainer}>
          <Text style={[styles.noRunTitle, { color: colors.foreground }]}>오늘의 브리핑 시작</Text>
          <Text style={[styles.noRunDesc, { color: colors.muted }]}>
            새 Run을 시작하면 17장의 카드가 활성화됩니다.
          </Text>
          <Pressable
            onPress={handleStartRun}
            disabled={loading}
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.startBtnText, { color: colors.background }]}>
                ▶ 새 Run 시작
              </Text>
            )}
          </Pressable>
        </View>
      ) : (
        <>
          {/* 진행률 바 */}
          <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                오늘 진행률
              </Text>
              <Text style={[styles.progressCount, { color: colors.primary }]}>
                {done}/{total}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.surface2 }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${pct}%` as any },
                ]}
              />
            </View>
            <Text style={[styles.progressRunId, { color: colors.muted }]}>
              {activeRun.runId}
            </Text>
          </View>

          {/* 카드 목록 */}
          <FlatList
            data={listData}
            keyExtractor={(item) =>
              item.type === "header" ? `header-${item.group.key}` : `card-${item.card.code}`
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  versionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noRunContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  noRunTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  noRunDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  startBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 180,
    alignItems: "center",
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressCount: {
    fontSize: 13,
    fontWeight: "700",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressRunId: {
    fontSize: 10,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 8,
    gap: 4,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 4,
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  groupHeaderLeft: {
    gap: 2,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  groupSub: {
    fontSize: 11,
  },
  groupProgress: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    gap: 8,
  },
  cardLeft: {
    flex: 1,
    gap: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardCode: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  defenseBadge: {
    fontSize: 11,
    fontWeight: "600",
  },
  nextBadge: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  cardDesc: {
    fontSize: 11,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  engineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  engineText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
