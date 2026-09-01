import { type ColorValue, Pressable, requireNativeComponent, type StyleProp, StyleSheet, Text, UIManager, type ViewProps, type ViewStyle } from "react-native";

type NativeGlassButtonShape = "capsule" | "circle" | "roundedRectangle";
type NativeGlassButtonFontWeight = "regular" | "medium" | "semibold" | "bold" | "heavy";

type NativeGlassButtonProps = {
  accessibilityLabel: string;
  color?: ColorValue;
  disabled?: boolean;
  fontSize?: number;
  fontWeight?: NativeGlassButtonFontWeight;
  shape?: NativeGlassButtonShape;
  style?: StyleProp<ViewStyle>;
  systemImage?: string;
  title?: string;
  onPress: () => void;
};

type NativeGlassButtonViewProps = ViewProps & {
  disabled: boolean;
  fontSize: number;
  fontWeight: NativeGlassButtonFontWeight;
  shape: NativeGlassButtonShape;
  systemImage: string;
  tintColorValue: string;
  title: string;
  onPress: () => void;
};

const hasNativeGlassButtonView = UIManager.getViewManagerConfig?.("NativeGlassButtonView") != null;
const NativeGlassButtonView = hasNativeGlassButtonView ? requireNativeComponent<NativeGlassButtonViewProps>("NativeGlassButtonView") : null;

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
  if (!NativeGlassButtonView) {
    const tint = String(color ?? "#111111");
    const label = title || fallbackSymbol(systemImage);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={[styles.fallbackButton, shape === "roundedRectangle" && styles.fallbackRoundedRectangle, disabled && styles.disabled, style]}
        onPress={onPress}
      >
        <Text style={[styles.fallbackLabel, { color: tint, fontSize, fontWeight: fallbackFontWeight(fontWeight) }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <NativeGlassButtonView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      fontSize={fontSize}
      fontWeight={fontWeight}
      shape={shape}
      style={[styles.host, disabled && styles.disabled, style]}
      systemImage={systemImage ?? ""}
      tintColorValue={String(color ?? "#111111")}
      title={title ?? ""}
      onPress={onPress}
    />
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

function fallbackFontWeight(fontWeight: NativeGlassButtonFontWeight) {
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
  fallbackButton: {
    alignItems: "center",
    borderColor: "rgba(0,0,0,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44
  },
  fallbackLabel: {
    lineHeight: 24
  },
  fallbackRoundedRectangle: {
    borderRadius: 18
  },
  disabled: {
    opacity: 0.55
  },
  host: {
    minHeight: 44,
    minWidth: 44
  }
});
