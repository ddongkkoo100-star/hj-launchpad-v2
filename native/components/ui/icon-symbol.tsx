// SF Symbols → Material Icons 매핑
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // 기본
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  // HJ 런치패드 탭바
  "chart.bar.fill": "bar-chart",
  "briefcase.fill": "work",
  "folder.fill": "folder",
  "gearshape.fill": "settings",
  // 카드 액션
  "play.fill": "play-arrow",
  "square.and.arrow.down": "save",
  "checkmark.circle.fill": "check-circle",
  "arrow.counterclockwise": "refresh",
  "doc.on.doc": "content-copy",
  "arrow.up.right.square": "open-in-new",
  "lock.fill": "lock",
  "exclamationmark.triangle.fill": "warning",
  "xmark.circle.fill": "cancel",
  "plus.circle.fill": "add-circle",
  "trash.fill": "delete",
  "square.and.arrow.up": "ios-share",
  "square.and.arrow.down.fill": "download",
  "info.circle": "info",
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
