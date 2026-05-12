import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getSessions, deleteSession } from "@/lib/storage";
import { ScanSession } from "@/lib/types";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 24 * 2 - 16 * 2) / 3;

export default function LibraryScreen() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);

  const loadSessions = useCallback(async () => {
    const data = await getSessions();
    setSessions(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleDelete = useCallback(
    (session: ScanSession) => {
      Alert.alert(
        "삭제 확인",
        `"${session.title}"을(를) 삭제할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: async () => {
              await deleteSession(session.id);
              await loadSessions();
            },
          },
        ]
      );
    },
    [loadSessions]
  );

  const handleSessionPress = (session: ScanSession) => {
    router.push({
      pathname: "/learn/[id]" as never,
      params: { id: session.id },
    });
  };

  const renderItem = ({ item }: { item: ScanSession }) => {
    const progressPercent = Math.round(
      ((item.lastPosition + 1) / item.sentences.length) * 100
    );
    const isCompleted = item.lastPosition >= item.sentences.length - 1;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
        onPress={() => handleSessionPress(item)}
        onLongPress={() => handleDelete(item)}
      >
        {/* 썸네일 */}
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbEmoji}>📖</Text>
          </View>
        )}

        {/* 완료 뱃지 */}
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>✓ 완료</Text>
          </View>
        )}

        {/* 카드 정보 */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardMeta}>
            {item.sentences.length}개 문장
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString("ko-KR")}
          </Text>

          {/* 진행률 바 */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressPercent}% 완료</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="book.fill" size={24} color="#F5A623" />
          <Text style={styles.headerTitle}>내 도서관</Text>
        </View>
        <Text style={styles.headerCount}>{sessions.length}권</Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>아직 스캔한 책이 없어요</Text>
          <Text style={styles.emptyDesc}>
            홈 화면에서 영어 책을 스캔하면{"\n"}여기에 저장됩니다.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.goHomeBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/")}
          >
            <Text style={styles.goHomeBtnText}>홈으로 가기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.hintText}>길게 누르면 삭제할 수 있어요</Text>
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={3}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1B2A",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerCount: {
    fontSize: 16,
    color: "#A8C0D6",
    backgroundColor: "#1A2E45",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hintText: {
    fontSize: 12,
    color: "#A8C0D6",
    marginBottom: 12,
  },
  listContent: {
    gap: 16,
    paddingBottom: 16,
  },
  row: {
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#1A2E45",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A4060",
  },
  thumb: {
    width: "100%",
    height: CARD_WIDTH * 0.7,
  },
  thumbPlaceholder: {
    width: "100%",
    height: CARD_WIDTH * 0.7,
    backgroundColor: "#0D1B2A",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: {
    fontSize: 40,
  },
  completedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#6BCB77",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D1B2A",
  },
  cardInfo: {
    padding: 10,
    gap: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 11,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  cardDate: {
    fontSize: 10,
    color: "#A8C0D6",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#2A4060",
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F5A623",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: "#A8C0D6",
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyEmoji: {
    fontSize: 72,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyDesc: {
    fontSize: 16,
    color: "#A8C0D6",
    textAlign: "center",
    lineHeight: 26,
  },
  goHomeBtn: {
    backgroundColor: "#F5A623",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  goHomeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D1B2A",
  },
});
