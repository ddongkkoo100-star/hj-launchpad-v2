import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useCardStatus } from "@/hooks/use-store";
import * as store from "@/lib/store";
import { STATUS, STATUS_META } from "@/lib/state-machine";
import { CARD_BY_CODE, VISIBLE_CARDS } from "@/data/cards";
import { DEPS } from "@/data/deps";

// {TODAY} 치환
function buildPrompt(prompt: string): string {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return prompt.replace(/\{TODAY\}/g, today);
}

export default function CardScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const colors = useColors();
  const status = useCardStatus(code);
  const [resultText, setResultText] = useState("");
  const [copying, setCopying] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const card = CARD_BY_CODE[code];

  // 기존 결과 로드
  useEffect(() => {
    if (!card) return;
    const result = store.getCardResult(code);
    if (result) setResultText(result.payload);
  }, [code, card]);

  if (!card) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={{ color: colors.error }}>카드를 찾을 수 없습니다: {code}</Text>
        </View>
      </ScreenContainer>
    );
  }

  const prompt = buildPrompt(card.prompt);
  const isDefense = card.defenseLine;
  const isLocked = !status || status === STATUS.LOCKED;
  const canStart = status === STATUS.READY;
  const canSave = status === STATUS.RUNNING || status === STATUS.PASTED || status === STATUS.MISSING;
  const canReview = status === STATUS.SAVED || status === STATUS.WARNING;
  const canRerun = status === STATUS.SAVED || status === STATUS.REVIEWED || status === STATUS.MISSING;

  // 잠김 이유 계산
  const lockedDeps = isLocked
    ? (DEPS[code] || []).filter(depCode => {
        const dep = CARD_BY_CODE[depCode];
        if (!dep || !dep.enabled) return false;
        const depStatus = store.getCardStatus(depCode);
        if (dep.defenseLine) return depStatus !== STATUS.REVIEWED;
        return depStatus !== STATUS.SAVED && depStatus !== STATUS.REVIEWED;
      })
    : [];

  const handleCopyPrompt = useCallback(async () => {
    setCopying(true);
    try {
      await Clipboard.setStringAsync(prompt);  // expo-clipboard
      setTimeout(() => setCopying(false), 1500);
    } catch {
      setCopying(false);
    }
  }, [prompt]);

  const handleOpenAI = useCallback(() => {
    if (card.aiTarget?.url) {
      Linking.openURL(card.aiTarget.url).catch(() =>
        Alert.alert("오류", "브라우저를 열 수 없습니다.")
      );
    }
  }, [card]);

  const handleStart = useCallback(async () => {
    try {
      await store.actionStart(code);
    } catch (e: any) {
      Alert.alert("오류", e.message);
    }
  }, [code]);

  const handleTextChange = useCallback(
    async (text: string) => {
      setResultText(text);
      if (text.trim().length > 0) {
        await store.actionPaste(code, text).catch(() => {});
      }
    },
    [code]
  );

  const handleSave = useCallback(async () => {
    const result = await store.actionSave(code, resultText);
    if (!result.ok) {
      Alert.alert("저장 실패", "내용을 입력해주세요.");
    }
  }, [code, resultText]);

  const handleReview = useCallback(async () => {
    if (isDefense) {
      Alert.alert(
        "🛡 방어선 검토",
        `${card.code}는 투자 판단의 마지막 방어선입니다.\n내용을 충분히 검토하셨나요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "검토 완료",
            style: "destructive",
            onPress: () => store.actionReview(code).catch(console.error),
          },
        ]
      );
    } else {
      await store.actionReview(code).catch(console.error);
    }
  }, [code, card, isDefense]);

  const handleRerun = useCallback(async () => {
    Alert.alert("재실행", "이 카드의 결과를 삭제하고 다시 실행하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "재실행",
        onPress: () => store.actionRerun(code).catch(console.error),
      },
    ]);
  }, [code]);

  const statusMeta = STATUS_META[status || STATUS.LOCKED];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* 상단 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerCode, { color: colors.primary }]}>{card.code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.color + "22", borderColor: statusMeta.color + "66" }]}>
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.icon} {statusMeta.label}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 방어선 경고 */}
        {isDefense && (
          <View style={[styles.defenseBox, { backgroundColor: colors.error + "15", borderColor: colors.error + "66" }]}>
            <Text style={[styles.defenseTitle, { color: colors.error }]}>
              🛡 방어선 카드 — 검토 완료 전 다음 카드 잠김
            </Text>
            <Text style={[styles.defenseDesc, { color: colors.error + "CC" }]}>
              이 카드는 투자 판단의 마지막 방어선입니다. 반드시 직접 검토 후 "검토 완료"를 눌러주세요.
            </Text>
          </View>
        )}

        {/* 카드 제목 */}
        <View style={styles.titleSection}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
          <Text style={[styles.cardDesc, { color: colors.muted }]}>{card.desc}</Text>
          {card.dep && (
            <Text style={[styles.cardDep, { color: colors.muted }]}>의존: {card.dep}</Text>
          )}
        </View>

        {/* 잠김 이유 */}
        {isLocked && lockedDeps.length > 0 && (
          <View style={[styles.lockedBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.lockedTitle, { color: colors.warning }]}>🔒 잠김 — 미완료 의존 카드</Text>
            {lockedDeps.map(depCode => {
              const dep = CARD_BY_CODE[depCode];
              const depStatus = store.getCardStatus(depCode);
              const depMeta = STATUS_META[depStatus || STATUS.LOCKED];
              return (
                <Text key={depCode} style={[styles.lockedDep, { color: colors.muted }]}>
                  • {depCode} {dep?.defenseLine ? "(방어선: REVIEWED 필요)" : ""} — {depMeta.label}
                </Text>
              );
            })}
          </View>
        )}

        {/* 프롬프트 섹션 */}
        <View style={[styles.promptSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.promptHeader}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>생성된 프롬프트</Text>
            <View style={styles.promptActions}>
              <Pressable
                onPress={handleCopyPrompt}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.primary + "22", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                  {copying ? "✓ 복사됨" : "📋 복사"}
                </Text>
              </Pressable>
              {card.aiTarget && (
                <Pressable
                  onPress={handleOpenAI}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.surface2, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.actionBtnText, { color: colors.foreground }]}>
                    {card.aiTarget.name} ↗
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          <ScrollView
            style={[styles.promptScroll, { backgroundColor: colors.background }]}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text style={[styles.promptText, { color: colors.foreground }]}>{prompt}</Text>
          </ScrollView>
        </View>

        {/* 결과 입력 */}
        {!isLocked && (
          <View style={[styles.resultSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>AI 결과 붙여넣기</Text>
            <TextInput
              ref={inputRef}
              style={[
                styles.resultInput,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              value={resultText}
              onChangeText={handleTextChange}
              multiline
              placeholder="AI에서 받은 결과를 여기에 붙여넣으세요..."
              placeholderTextColor={colors.muted}
              textAlignVertical="top"
              returnKeyType="default"
            />
          </View>
        )}

        {/* 액션 버튼 */}
        <View style={styles.actionRow}>
          {canStart && (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.mainBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.mainBtnText, { color: colors.background }]}>▶ 시작</Text>
            </Pressable>
          )}
          {canSave && (
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.mainBtn,
                { backgroundColor: colors.success, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.mainBtnText, { color: "#fff" }]}>💾 저장</Text>
            </Pressable>
          )}
          {canReview && (
            <Pressable
              onPress={handleReview}
              style={({ pressed }) => [
                styles.mainBtn,
                {
                  backgroundColor: isDefense ? colors.error : colors.success,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.mainBtnText, { color: "#fff" }]}>
                {isDefense ? "🛡 검토 완료" : "✓ 검토 완료"}
              </Text>
            </Pressable>
          )}
          {canRerun && (
            <Pressable
              onPress={handleRerun}
              style={({ pressed }) => [
                styles.subBtn,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.subBtnText, { color: colors.muted }]}>↺ 재실행</Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  backBtn: {
    padding: 4,
    width: 36,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerCode: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerRight: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  defenseBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  defenseTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  defenseDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  titleSection: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardDep: {
    fontSize: 11,
    marginTop: 2,
  },
  lockedBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  lockedTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  lockedDep: {
    fontSize: 12,
    lineHeight: 18,
  },
  promptSection: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  promptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  promptActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  promptScroll: {
    maxHeight: 240,
    padding: 12,
  },
  promptText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  resultSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  resultInput: {
    minHeight: 160,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  mainBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  mainBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  subBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  subBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
