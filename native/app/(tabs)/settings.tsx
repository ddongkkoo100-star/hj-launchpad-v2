import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as store from "@/lib/store";

const FONT_SIZES = [
  { key: "small", label: "소", size: 12 },
  { key: "normal", label: "중", size: 14 },
  { key: "large", label: "대", size: 16 },
] as const;

const ABSOLUTE_RULES = [
  { no: 1, text: "AI 서비스 자동 접속 금지. 어떤 모델 API에도 직접 호출하지 않는다." },
  { no: 2, text: "다음 카드 자동 진행 금지. 사람이 명시적으로 클릭해야 다음 카드로 간다." },
  { no: 3, text: "G1 / C1 / I2 방어선 자동화 금지. 이 셋은 사용자 검토 필수." },
  { no: 4, text: "투자 판단 자동 생성 금지. 매수·매도·비중 추천 코드 작성 금지." },
  { no: 5, text: "이 앱은 수동 실행 도우미다. 판단은 항상 사람이 한다." },
];

export default function SettingsScreen() {
  const colors = useColors();
  const [fontScale, setFontScale] = useState<"small" | "normal" | "large">("normal");

  useEffect(() => {
    store.getSetting("fontScale").then(val => {
      if (val === "small" || val === "normal" || val === "large") {
        setFontScale(val);
      }
    });
  }, []);

  const handleFontScale = useCallback(async (key: "small" | "normal" | "large") => {
    setFontScale(key);
    await store.setSetting("fontScale", key);
  }, []);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>설정</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 글자 크기 */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>글자 크기</Text>
          <View style={styles.fontRow}>
            {FONT_SIZES.map(f => (
              <Pressable
                key={f.key}
                onPress={() => handleFontScale(f.key)}
                style={({ pressed }) => [
                  styles.fontBtn,
                  {
                    backgroundColor:
                      fontScale === f.key ? colors.primary + "22" : colors.background,
                    borderColor:
                      fontScale === f.key ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fontBtnLabel,
                    {
                      color: fontScale === f.key ? colors.primary : colors.muted,
                      fontSize: f.size,
                    },
                  ]}
                >
                  {f.label}
                </Text>
                <Text
                  style={[
                    styles.fontBtnSub,
                    { color: fontScale === f.key ? colors.primary : colors.muted },
                  ]}
                >
                  {f.size}px
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 5대 절대 원칙 */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>5대 절대 원칙</Text>
          <Text style={[styles.sectionSub, { color: colors.muted }]}>
            이 앱이 절대 하지 않는 것
          </Text>
          {ABSOLUTE_RULES.map(rule => (
            <View
              key={rule.no}
              style={[styles.ruleItem, { borderLeftColor: colors.error + "66" }]}
            >
              <Text style={[styles.ruleNo, { color: colors.error }]}>{rule.no}</Text>
              <Text style={[styles.ruleText, { color: colors.foreground }]}>{rule.text}</Text>
            </View>
          ))}
        </View>

        {/* 앱 정보 */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>앱 정보</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>버전</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>v0.1-native</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>기반</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>hj-launchpad-v2 Step 6</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>정체성</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>수동 실행 도우미</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>카드</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>17장 (visible)</Text>
          </View>
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
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionSub: {
    fontSize: 12,
    marginTop: -6,
  },
  fontRow: {
    flexDirection: "row",
    gap: 8,
  },
  fontBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 2,
  },
  fontBtnLabel: {
    fontWeight: "700",
  },
  fontBtnSub: {
    fontSize: 10,
  },
  ruleItem: {
    flexDirection: "row",
    gap: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    paddingVertical: 4,
  },
  ruleNo: {
    fontSize: 14,
    fontWeight: "800",
    minWidth: 16,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
  },
});
