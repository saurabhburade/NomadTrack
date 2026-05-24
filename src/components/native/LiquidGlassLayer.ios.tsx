import { BlurView, type BlurTint } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable, type GlassColorScheme, type GlassStyle } from "expo-glass-effect";
import { StyleSheet, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

type LiquidGlassLayerProps = {
  colorScheme?: GlassColorScheme;
  glassStyle?: Exclude<GlassStyle, "none">;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  tint?: BlurTint;
  tintColor?: ColorValue;
};

function canUseLiquidGlass() {
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

export function LiquidGlassLayer({ colorScheme = "auto", glassStyle = "regular", intensity = 70, style, tint = "light", tintColor }: LiquidGlassLayerProps) {
  if (canUseLiquidGlass()) {
    return (
      <GlassView
        colorScheme={colorScheme}
        glassEffectStyle={glassStyle}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, style]}
        tintColor={tintColor ? String(tintColor) : undefined}
      />
    );
  }

  return <BlurView intensity={intensity} pointerEvents="none" tint={tint} style={[StyleSheet.absoluteFill, style]} />;
}
