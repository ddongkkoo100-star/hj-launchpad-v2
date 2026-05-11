import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  Share,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as store from "@/lib/store";
import { Run } from "@/lib/store";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DataScreen() {
  const colors = useColors();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRuns = useCallback(async () => {
    const all = await store.getAllRuns();
    setRuns(all.sort((a, b) => b.startedAt - a.startedAt));
  }, []);

  useEffect(() => {
    loadRuns();
    const unsub = store.subscribe(() => loadRuns());
    return unsub;
  }, [loadRuns]);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await store.exportAllData();
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        message: json,
        title: "HJ 런치패드 데이터 내보내기",
      });
    } catch (e: any) {
      Alert.alert("오류", e.message || "내보내기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteRun = useCallback(
    (runId: string) => {
      Alert.alert(
        "Run 삭제",
        `${runId}를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: async () => {
              await store.deleteRunCascade(runId);
              loadRuns();
            },
          },
        ]
      );
    },
    [loadRuns]
  );

  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      "전체 초기화",
      "모든 Run 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "전체 삭제",
          style: "destructive",
          onPress: async () => {
            await store.deleteEverything();
            loadRuns();
          },
        },
      ]
    );
  }, [loadRuns]);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>자료관리</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 액션 버튼 */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleExport}
            disabled={loading}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary + "22", borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              ↑ JSON 내보내기
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteAll}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.error + "15", borderColor: colors.error, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.actionBtnText, { color: colors.error }]}>
              🗑 전체 초기화
            </Text>
          </Pressable>
        </View>

        {/* Run 목록 */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Run 목록 ({runs.length}개)
          </Text>
          {runs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              저장된 Run이 없습니다.
            </Text>
          ) : (
            runs.map(run => (
              <View
                key={run.runId}
                style={[
                  styles.runItem,
                  {
                    backgroundColor: colors.background,
                    borderColor: run.status === "active" ? colors.primary + "66" : colors.border,
                    borderWidth: run.status === "active" ? 1.5 : 1,
                  },
                ]}
              >
                <View style={styles.runLeft}>
                  <View style={styles.runHeader}>
                    <Text style={[styles.runId, { color: colors.foreground }]}>{run.runId}</Text>
                    {run.status === "active" && (
                      <View style={[styles.activeBadge, { backgroundColor: colors.primary + "22" }]}>
                        <Text style={[styles.activeBadgeText, { color: colors.primary }]}>활성</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.runDate, { color: colors.muted }]}>
                    시작: {formatDate(run.startedAt)}
                  </Text>
                  {run.note ? (
                    <Text style={[styles.runNote, { color: colors.muted }]}>{run.note}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => handleDeleteRun(run.runId)}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[styles.deleteBtnText, { color: colors.error }]}>삭제</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
  runItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  runLeft: {
    flex: 1,
    gap: 3,
  },
  runHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  runId: {
    fontSize: 13,
    fontWeight: "600",
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  runDate: {
    fontSize: 11,
  },
  runNote: {
    fontSize: 11,
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
