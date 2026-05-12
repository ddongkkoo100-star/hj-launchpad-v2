// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navigation
  "house.fill": "home",
  "book.fill": "menu-book",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "xmark": "close",
  "gear": "settings",
  "arrow.left": "arrow-back",

  // Camera & Media
  "camera.fill": "camera-alt",
  "photo.fill": "photo-library",
  "bolt.fill": "flash-on",
  "bolt.slash.fill": "flash-off",

  // Playback
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "backward.fill": "skip-previous",
  "forward.fill": "skip-next",
  "repeat": "repeat",

  // Learning
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "checkmark.circle.fill": "check-circle",
  "star.fill": "star",
  "trash.fill": "delete",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
