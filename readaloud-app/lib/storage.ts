import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScanSession } from "./types";

const SESSIONS_KEY = "readaloud_sessions";

export async function getSessions(): Promise<ScanSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScanSession[];
  } catch {
    return [];
  }
}

export async function saveSession(session: ScanSession): Promise<void> {
  const sessions = await getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session); // 최신 항목을 앞에 추가
  }
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
}

export async function updateLastPosition(sessionId: string, position: number): Promise<void> {
  const sessions = await getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx >= 0) {
    sessions[idx].lastPosition = position;
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }
}
