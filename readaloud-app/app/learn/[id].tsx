import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Speech from "expo-speech";
import { useKeepAwake } from "expo-keep-awake";
import { getSessions, updateLastPosition } from "@/lib/storage";
import { ScanSession, Sentence, SpeedOption, LearningMode } from "@/lib/types";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width } = Dimensions.get("window");

const SPEED_OPTIONS: SpeedOption[] = [0.5, 0.75, 1.0, 1.25, 1.5];

function getSpeedLabel(speed: SpeedOption): string {
  return `${speed}x`;
}

export default function LearnScreen() {
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<ScanSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showKorean, setShowKorean] = useState(true);
  const [mode, setMode] = useState<LearningMode>("manual");
  const [speed, setSpeed] = useState<SpeedOption>(1.0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number>(-1);

  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 세션 로드
  useEffect(() => {
    (async () => {
      const sessions = await getSessions();
      const found = sessions.find((s) => s.id === id);
      if (found) {
        setSession(found);
        setCurrentIndex(found.lastPosition || 0);
      }
    })();
  }, [id]);

  const currentSentence: Sentence | undefined = session?.sentences[currentIndex];

  // TTS 중지 헬퍼
  const stopSpeech = useCallback(async () => {
    await Speech.stop();
    setIsPlaying(false);
    setHighlightedWordIndex(-1);
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  }, []);

  // 화면 전환 애니메이션
  const animateTransition = useCallback(
    (callback: () => void) => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      callback();
    },
    [fadeAnim]
  );

  // 문장 읽기
  const speakSentence = useCallback(
    (sentence: Sentence, onDone?: () => void) => {
      setIsPlaying(true);
      setHighlightedWordIndex(-1);
      const words = sentence.en.split(/\s+/);

      Speech.speak(sentence.en, {
        language: "en-US",
        rate: speed,
        onStart: () => setIsPlaying(true),
        onDone: () => {
          setIsPlaying(false);
          setHighlightedWordIndex(-1);
          onDone?.();
        },
        onStopped: () => {
          setIsPlaying(false);
          setHighlightedWordIndex(-1);
        },
        onError: () => {
          setIsPlaying(false);
          setHighlightedWordIndex(-1);
        },
        onBoundary: (event: any) => {
          if (!event) return;
          // 현재 읽는 단어 인덱스 계산
          let charCount = 0;
          for (let i = 0; i < words.length; i++) {
            charCount += words[i].length + 1;
            if (charCount > (event.charIndex ?? 0)) {
              setHighlightedWordIndex(i);
              break;
            }
          }
        },
      });
    },
    [speed]
  );

  // 자동 모드: 다음 문장으로 이동
  const playNextAuto = useCallback(
    (index: number) => {
      if (!session) return;
      if (index >= session.sentences.length) {
        setIsPlaying(false);
        return;
      }
      animateTransition(() => setCurrentIndex(index));
      autoPlayTimer.current = setTimeout(() => {
        speakSentence(session.sentences[index], () => {
          autoPlayTimer.current = setTimeout(() => {
            playNextAuto(index + 1);
          }, 1500);
        });
      }, 300);
    },
    [session, animateTransition, speakSentence]
  );

  // 재생/일시정지 토글
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await stopSpeech();
    } else {
      if (!currentSentence) return;
      if (mode === "auto") {
        playNextAuto(currentIndex);
      } else {
        speakSentence(currentSentence);
      }
    }
  }, [isPlaying, currentSentence, mode, currentIndex, stopSpeech, playNextAuto, speakSentence]);

  // 이전 문장
  const handlePrev = useCallback(async () => {
    if (currentIndex <= 0) return;
    await stopSpeech();
    const newIdx = currentIndex - 1;
    animateTransition(() => setCurrentIndex(newIdx));
    await updateLastPosition(id!, newIdx);
  }, [currentIndex, stopSpeech, animateTransition, id]);

  // 다음 문장
  const handleNext = useCallback(async () => {
    if (!session || currentIndex >= session.sentences.length - 1) return;
    await stopSpeech();
    const newIdx = currentIndex + 1;
    animateTransition(() => setCurrentIndex(newIdx));
    await updateLastPosition(id!, newIdx);
  }, [session, currentIndex, stopSpeech, animateTransition, id]);

  // 속도 감소
  const handleSlowDown = useCallback(async () => {
    const idx = SPEED_OPTIONS.indexOf(speed);
    if (idx > 0) {
      await stopSpeech();
      setSpeed(SPEED_OPTIONS[idx - 1]);
    }
  }, [speed, stopSpeech]);

  // 속도 증가
  const handleSpeedUp = useCallback(async () => {
    const idx = SPEED_OPTIONS.indexOf(speed);
    if (idx < SPEED_OPTIONS.length - 1) {
      await stopSpeech();
      setSpeed(SPEED_OPTIONS[idx + 1]);
    }
  }, [speed, stopSpeech]);

  // 모드 전환
  const handleModeToggle = useCallback(async () => {
    await stopSpeech();
    setMode((m) => (m === "auto" ? "manual" : "auto"));
  }, [stopSpeech]);

  // 언마운트 시 TTS 중지
  useEffect(() => {
    return () => {
      Speech.stop();
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current);
    };
  }, []);

  // 속도 변경 시 재생 중이면 재시작
  useEffect(() => {
    if (isPlaying && currentSentence) {
      Speech.stop().then(() => {
        speakSentence(currentSentence);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  if (!session || !currentSentence) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  const words = currentSentence.en.split(/\s+/);
  const totalSentences = session.sentences.length;
  const progress = ((currentIndex + 1) / totalSentences) * 100;

  return (
    <View style={styles.container}>
      {/* 상단 바 */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.topBtn, pressed && { opacity: 0.6 }]}
          onPress={async () => {
            await stopSpeech();
            router.back();
          }}
        >
          <IconSymbol name="arrow.left" size={22} color="#A8C0D6" />
        </Pressable>

        {/* 모드 토글 */}
        <Pressable
          style={({ pressed }) => [styles.modeToggle, pressed && { opacity: 0.8 }]}
          onPress={handleModeToggle}
        >
          <View style={[styles.modeIndicator, mode === "auto" && styles.modeIndicatorActive]} />
          <Text style={[styles.modeText, mode === "auto" && styles.modeTextActive]}>
            {mode === "auto" ? "🔄 자동 모드" : "✋ 수동 모드"}
          </Text>
        </Pressable>

        {/* 진행 카운터 */}
        <View style={styles.progressCounter}>
          <Text style={styles.progressCounterText}>
            {currentIndex + 1} / {totalSentences}
          </Text>
        </View>
      </View>

      {/* 진행 바 */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.mainContent}>
        {/* 영어 문장 카드 */}
        <Animated.View style={[styles.sentenceCard, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.sentenceScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.wordsContainer}>
              {words.map((word, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.wordText,
                    idx === highlightedWordIndex && styles.wordHighlighted,
                  ]}
                >
                  {word}{" "}
                </Text>
              ))}
            </View>
          </ScrollView>
        </Animated.View>

        {/* 한국어 해석 카드 */}
        <View style={styles.koreanCard}>
          <View style={styles.koreanCardHeader}>
            <Text style={styles.koreanLabel}>🇰🇷 한국어 해석</Text>
            <Pressable
              style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.7 }]}
              onPress={() => setShowKorean((v) => !v)}
            >
              <IconSymbol
                name={showKorean ? "eye.slash.fill" : "eye.fill"}
                size={18}
                color="#A8C0D6"
              />
              <Text style={styles.toggleBtnText}>
                {showKorean ? "숨기기" : "보기"}
              </Text>
            </Pressable>
          </View>
          {showKorean && (
            <Text style={styles.koreanText}>{currentSentence.ko}</Text>
          )}
          {!showKorean && (
            <Text style={styles.koreanHiddenText}>탭하여 해석 보기 →</Text>
          )}
        </View>
      </View>

      {/* 하단 컨트롤 바 */}
      <View style={styles.controlBar}>
        {/* 속도 느리게 */}
        <Pressable
          style={({ pressed }) => [styles.speedBtn, pressed && { opacity: 0.7 }]}
          onPress={handleSlowDown}
          disabled={SPEED_OPTIONS.indexOf(speed) === 0}
        >
          <Text style={[styles.speedIcon, SPEED_OPTIONS.indexOf(speed) === 0 && styles.speedBtnDisabled]}>
            🐢
          </Text>
        </Pressable>

        <Text style={styles.speedLabel}>{getSpeedLabel(speed)}</Text>

        {/* 이전 */}
        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            pressed && { opacity: 0.7 },
            currentIndex === 0 && styles.navBtnDisabled,
          ]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
        >
          <IconSymbol name="backward.fill" size={28} color={currentIndex === 0 ? "#2A4060" : "#FFFFFF"} />
        </Pressable>

        {/* 재생/일시정지 */}
        <Pressable
          style={({ pressed }) => [
            styles.playBtn,
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          onPress={handlePlayPause}
        >
          <IconSymbol
            name={isPlaying ? "pause.fill" : "play.fill"}
            size={36}
            color="#0D1B2A"
          />
        </Pressable>

        {/* 다음 */}
        <Pressable
          style={({ pressed }) => [
            styles.navBtn,
            pressed && { opacity: 0.7 },
            currentIndex >= totalSentences - 1 && styles.navBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={currentIndex >= totalSentences - 1}
        >
          <IconSymbol
            name="forward.fill"
            size={28}
            color={currentIndex >= totalSentences - 1 ? "#2A4060" : "#FFFFFF"}
          />
        </Pressable>

        <Text style={styles.speedLabel}>{getSpeedLabel(speed)}</Text>

        {/* 속도 빠르게 */}
        <Pressable
          style={({ pressed }) => [styles.speedBtn, pressed && { opacity: 0.7 }]}
          onPress={handleSpeedUp}
          disabled={SPEED_OPTIONS.indexOf(speed) === SPEED_OPTIONS.length - 1}
        >
          <Text
            style={[
              styles.speedIcon,
              SPEED_OPTIONS.indexOf(speed) === SPEED_OPTIONS.length - 1 && styles.speedBtnDisabled,
            ]}
          >
            🐇
          </Text>
        </Pressable>
      </View>

      {/* 진행 도트 */}
      <View style={styles.dotsContainer}>
        {session.sentences.map((_, idx) => (
          <Pressable
            key={idx}
            onPress={async () => {
              await stopSpeech();
              animateTransition(() => setCurrentIndex(idx));
              await updateLastPosition(id!, idx);
            }}
          >
            <View
              style={[
                styles.dot,
                idx === currentIndex && styles.dotActive,
                idx < currentIndex && styles.dotDone,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* 올빼미 마스코트 */}
      <View style={styles.mascotContainer} pointerEvents="none">
        <Text style={styles.mascotEmoji}>🦉</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1B2A",
  },
  loadingText: {
    color: "#A8C0D6",
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2E45",
    borderRadius: 22,
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A2E45",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A4060",
  },
  modeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2A4060",
  },
  modeIndicatorActive: {
    backgroundColor: "#4ECDC4",
  },
  modeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A8C0D6",
  },
  modeTextActive: {
    color: "#4ECDC4",
  },
  progressCounter: {
    backgroundColor: "#1A2E45",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A4060",
  },
  progressCounterText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F5A623",
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: "#1A2E45",
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#F5A623",
    borderRadius: 2,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  sentenceCard: {
    flex: 1,
    backgroundColor: "#1A2E45",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2A4060",
    padding: 28,
    justifyContent: "center",
  },
  sentenceScroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
  wordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
  },
  wordText: {
    fontSize: 52,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 72,
    letterSpacing: 0.5,
  },
  wordHighlighted: {
    color: "#FFE66D",
    textShadowColor: "rgba(255, 230, 109, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  koreanCard: {
    backgroundColor: "rgba(26, 46, 69, 0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2A4060",
    padding: 16,
    minHeight: 80,
  },
  koreanCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  koreanLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A8C0D6",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D1B2A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleBtnText: {
    fontSize: 12,
    color: "#A8C0D6",
  },
  koreanText: {
    fontSize: 26,
    color: "#C8E6FA",
    lineHeight: 40,
    fontWeight: "500",
  },
  koreanHiddenText: {
    fontSize: 16,
    color: "#2A4060",
    fontStyle: "italic",
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#1A2E45",
    marginHorizontal: 20,
    borderRadius: 32,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2A4060",
  },
  speedBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  speedIcon: {
    fontSize: 28,
  },
  speedBtnDisabled: {
    opacity: 0.3,
  },
  speedLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A8C0D6",
    minWidth: 36,
    textAlign: "center",
  },
  navBtn: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1B2A",
    borderRadius: 26,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F5A623",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingBottom: 12,
    flexWrap: "wrap",
    paddingHorizontal: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2A4060",
  },
  dotActive: {
    backgroundColor: "#F5A623",
    width: 20,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: "#4ECDC4",
  },
  mascotContainer: {
    position: "absolute",
    top: 12,
    right: 80,
  },
  mascotEmoji: {
    fontSize: 36,
  },
});
