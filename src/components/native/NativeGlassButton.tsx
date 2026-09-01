import { type ColorValue, Pressable, type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";

type NativeGlassButtonProps = {
  accessibilityLabel: string;
  color?: ColorValue;
  disabled?: boolean;
  fontSize?: number;
  fontWeight?: "regular" | "medium" | "semibold" | "bold" | "heavy";
  shape?: "capsule" | "circle" | "roundedRectangle";
  style?: StyleProp<ViewStyle>;
  systemImage?: string;
  title?: string;
  onPress: () => void;
};

export function NativeGlassButton({
  accessibilityLabel,
  color,
  disabled = false,
  fontSize = 17,
  fontWeight = "semibold",
  shape = "capsule",
  style,
  systemImage,
  title,
  onPress
}: NativeGlassButtonProps) {
  const tint = String(color ?? "#111111");
  const label = title || fallbackSymbol(systemImage);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[styles.button, shape === "circle" && styles.circle, shape === "roundedRectangle" && styles.roundedRectangle, disabled && styles.disabled, style]}
      onPress={onPress}
    >
      <Text style={[styles.label, { color: tint, fontSize, fontWeight: fallbackFontWeight(fontWeight) }]}>{label}</Text>
    </Pressable>
  );
}

function fallbackSymbol(systemImage?: string) {
  switch (systemImage) {
    case "plus":
      return "+";
    case "minus":
      return "-";
    case "arrow.clockwise":
      return "↻";
    default:
      return "";
  }
}

function fallbackFontWeight(fontWeight: NonNullable<NativeGlassButtonProps["fontWeight"]>) {
  switch (fontWeight) {
    case "regular":
      return "400" as const;
    case "medium":
      return "500" as const;
    case "bold":
      return "700" as const;
    case "heavy":
      return "800" as const;
    default:
      return "600" as const;
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: "rgba(0,0,0,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44
  },
  circle: {
    borderRadius: 999
  },
  disabled: {
    opacity: 0.55
  },
  label: {
    lineHeight: 24
  },
  roundedRectangle: {
    borderRadius: 18
  }
});
