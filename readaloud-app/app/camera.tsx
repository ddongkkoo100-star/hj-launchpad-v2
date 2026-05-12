import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";
import { saveSession } from "@/lib/storage";
import { ScanSession, Sentence } from "@/lib/types";

const { width, height } = Dimensions.get("window");

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const extractMutation = trpc.scan.extractSentences.useMutation();

  const processImage = useCallback(
    async (imageUri: string) => {
      setIsProcessing(true);
      try {
        const result = await extractMutation.mutateAsync({ imageUri });
        if (!result.sentences || result.sentences.length === 0) {
          Alert.alert("인식 실패", "문장을 찾을 수 없어요. 다시 시도해 주세요.");
          return;
        }
        const session: ScanSession = {
          id: Date.now().toString(),
          title: result.title || "새 학습 세션",
          createdAt: new Date().toISOString(),
          imageUri,
          sentences: result.sentences as Sentence[],
          lastPosition: 0,
        };
        await saveSession(session);
        router.replace({
          pathname: "/learn/[id]" as never,
          params: { id: session.id },
        });
      } catch (err) {
        Alert.alert("오류", "문장 추출 중 오류가 발생했어요. 다시 시도해 주세요.");
      } finally {
        setIsProcessing(false);
      }
    },
    [extractMutation]
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        await processImage(photo.uri);
      }
    } catch {
      Alert.alert("오류", "사진 촬영에 실패했어요.");
    }
  }, [isProcessing, processImage]);

  const handleGalleryPick = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await processImage(result.assets[0].uri);
    }
  }, [processImage]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#F5A623" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>카메라 권한이 필요해요</Text>
          <Text style={styles.permissionDesc}>
            영어 책을 촬영하여 문장을 추출하려면{"\n"}카메라 접근 권한이 필요합니다.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.permissionBtn, pressed && { opacity: 0.8 }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>권한 허용하기</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>돌아가기</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flashOn ? "on" : "off"}
      />

      {/* 상단 오버레이 */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="xmark" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.topTitle}>책 스캔하기</Text>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          onPress={() => setFlashOn((v) => !v)}
        >
          <IconSymbol
            name={flashOn ? "bolt.fill" : "bolt.slash.fill"}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {/* 스캔 프레임 */}
      <View style={styles.frameContainer} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.frameHint}>텍스트를 프레임 안에 맞추고 촬영하세요</Text>
      </View>

      {/* 하단 컨트롤 */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.sideBtn, pressed && { opacity: 0.7 }]}
          onPress={handleGalleryPick}
          disabled={isProcessing}
        >
          <IconSymbol name="photo.fill" size={28} color="#FFFFFF" />
          <Text style={styles.sideBtnLabel}>갤러리</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.captureBtn,
            pressed && { transform: [{ scale: 0.95 }] },
            isProcessing && { opacity: 0.5 },
          ]}
          onPress={handleCapture}
          disabled={isProcessing}
        >
          <View style={styles.captureBtnInner} />
        </Pressable>

        <View style={styles.sideBtn} />
      </View>

      {/* 처리 중 오버레이 */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingBox}>
            <ActivityIndicator color="#F5A623" size="large" />
            <Text style={styles.processingTitle}>🦉 AI가 문장을 읽고 있어요...</Text>
            <Text style={styles.processingDesc}>영어 문장을 추출하고 번역하는 중입니다</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const FRAME_W = width * 0.65;
const FRAME_H = height * 0.55;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  frameContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
    borderWidth: 2,
    borderColor: "rgba(245, 166, 35, 0.6)",
    borderRadius: 8,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#F5A623",
    borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  frameHint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 40,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sideBtn: {
    width: 64,
    alignItems: "center",
    gap: 4,
  },
  sideBtnLabel: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 27, 42, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  processingBox: {
    alignItems: "center",
    gap: 16,
    padding: 32,
    backgroundColor: "#1A2E45",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2A4060",
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  processingDesc: {
    fontSize: 14,
    color: "#A8C0D6",
    textAlign: "center",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 40,
  },
  permissionIcon: {
    fontSize: 64,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  permissionDesc: {
    fontSize: 16,
    color: "#A8C0D6",
    textAlign: "center",
    lineHeight: 26,
  },
  permissionBtn: {
    backgroundColor: "#F5A623",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 8,
  },
  permissionBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0D1B2A",
  },
  backBtn: {
    paddingVertical: 10,
  },
  backBtnText: {
    fontSize: 16,
    color: "#A8C0D6",
  },
});
