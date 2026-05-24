import { BlurView, type BlurTint } from "expo-blur";
import { StyleSheet, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

type LiquidGlassLayerProps = {
  colorScheme?: "auto" | "light" | "dark";
  glassStyle?: "clear" | "regular";
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  tint?: BlurTint;
  tintColor?: ColorValue;
};

export function LiquidGlassLayer({ intensity = 70, style, tint = "light" }: LiquidGlassLayerProps) {
  return <BlurView intensity={intensity} pointerEvents="none" tint={tint} style={[StyleSheet.absoluteFill, style]} />;
}
