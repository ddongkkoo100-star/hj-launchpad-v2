import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getSessions } from "@/lib/storage";
import { ScanSession } from "@/lib/types";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);

  const loadSessions = useCallback(async () => {
    const data = await getSessions();
    setSessions(data.slice(0, 6)); // 최근 6개만 표시
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleScanPress = () => {
    router.push("/camera");
  };

  const handleSessionPress = (session: ScanSession) => {
    router.push({
      pathname: "/learn/[id]" as never,
      params: { id: session.id },
    });
  };

  const renderSessionCard = ({ item }: { item: ScanSession }) => (
    <Pressable
      style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.75 }]}
      onPress={() => handleSessionPress(item)}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.sessionThumb} resizeMode="cover" />
      ) : (
        <View style={styles.sessionThumbPlaceholder}>
          <IconSymbol name="book.fill" size={32} color="#F5A623" />
        </View>
      )}
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.sessionMeta}>
          {item.sentences.length}개 문장 · {new Date(item.createdAt).toLocaleDateString("ko-KR")}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(
                  ((item.lastPosition + 1) / item.sentences.length) * 100
                )}%`,
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logoImg}
          />
          <Text style={styles.logoText}>ReadAloud</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.6 }]}
          onPress={() => {}}
        >
          <IconSymbol name="gear" size={26} color="#A8C0D6" />
        </Pressable>
      </View>

      {/* 메인 영역 */}
      <View style={styles.mainArea}>
        {/* 왼쪽: 카메라 버튼 */}
        <View style={styles.leftPanel}>
          <Text style={styles.welcomeText}>책을 찍어서{"\n"}영어를 배워요!</Text>
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
            ]}
            onPress={handleScanPress}
          >
            <View style={styles.scanButtonInner}>
              <IconSymbol name="camera.fill" size={52} color="#0D1B2A" />
              <Text style={styles.scanButtonText}>책 스캔하기</Text>
            </View>
          </Pressable>
          <Text style={styles.hintText}>📚 영어 책 페이지를 카메라로 찍어보세요</Text>
        </View>

        {/* 오른쪽: 최근 학습 */}
        <View style={styles.rightPanel}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="book.fill" size={20} color="#F5A623" />
            <Text style={styles.sectionTitle}>최근 학습</Text>
          </View>
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🦉</Text>
              <Text style={styles.emptyText}>아직 학습한 책이 없어요.{"\n"}첫 번째 책을 스캔해 보세요!</Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              renderItem={renderSessionCard}
              numColumns={2}
              columnWrapperStyle={styles.sessionRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sessionList}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1B2A",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoImg: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F5A623",
    letterSpacing: 0.5,
  },
  settingsBtn: {
    padding: 8,
  },
  mainArea: {
    flex: 1,
    flexDirection: "row",
    gap: 24,
  },
  leftPanel: {
    width: width * 0.32,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 32,
  },
  scanButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F5A623",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  scanButtonInner: {
    alignItems: "center",
    gap: 10,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D1B2A",
  },
  hintText: {
    fontSize: 13,
    color: "#A8C0D6",
    textAlign: "center",
  },
  rightPanel: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyText: {
    fontSize: 16,
    color: "#A8C0D6",
    textAlign: "center",
    lineHeight: 26,
  },
  sessionList: {
    gap: 12,
  },
  sessionRow: {
    gap: 12,
  },
  sessionCard: {
    flex: 1,
    backgroundColor: "#1A2E45",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A4060",
  },
  sessionThumb: {
    width: "100%",
    height: 100,
  },
  sessionThumbPlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#0D1B2A",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionInfo: {
    padding: 10,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  sessionMeta: {
    fontSize: 11,
    color: "#A8C0D6",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#2A4060",
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F5A623",
    borderRadius: 2,
  },
});
