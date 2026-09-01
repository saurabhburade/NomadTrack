import { type ColorValue, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

type NativeProgressProps = {
  color?: ColorValue;
  progress?: number | null;
  style?: StyleProp<ViewStyle>;
  trackColor?: ColorValue;
  variant?: "circular" | "linear";
};

export function NativeProgress({ color, progress = null, style, trackColor, variant = "linear" }: NativeProgressProps) {
  const clampedProgress = typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : 0.38;

  if (variant === "circular") {
    return <View style={[styles.circular, color ? { borderTopColor: color } : null, style]} />;
  }

  return (
    <View style={[styles.track, trackColor ? { backgroundColor: trackColor } : null, style]}>
      <View style={[styles.fill, { width: `${clampedProgress * 100}%` }, color ? { backgroundColor: color } : null]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circular: {
    borderColor: "rgba(142,142,147,0.32)",
    borderRadius: 999,
    borderTopColor: "#0a84ff",
    borderWidth: 2,
    height: 28,
    width: 28
  },
  fill: {
    backgroundColor: "#0a84ff",
    borderRadius: 999,
    height: "100%"
  },
  track: {
    backgroundColor: "rgba(142,142,147,0.24)",
    borderRadius: 999,
    height: 4,
    overflow: "hidden",
    width: "100%"
  }
});
