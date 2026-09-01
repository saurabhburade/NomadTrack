import { Check, ChevronLeft, ChevronRight, ExternalLink, Plus, Share, Trash2 } from "lucide-react-native";
import type { ComponentType } from "react";
import { type ColorValue, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { iconStrokeWidth } from "../../lib/colors";

type NativeButtonProps = {
  accessibilityLabel?: string;
  color?: ColorValue;
  controlSize?: "mini" | "small" | "regular" | "large" | "extraLarge";
  disabled?: boolean;
  frame?: { width?: number; height?: number; minHeight?: number; maxWidth?: number };
  foregroundColor?: ColorValue;
  fullWidth?: boolean;
  role?: "default" | "cancel" | "destructive";
  style?: StyleProp<ViewStyle>;
  systemImage?: string;
  title?: string;
  variant?: "default" | "bordered" | "borderless" | "borderedProminent" | "plain" | "glass" | "glassProminent";
  onPress?: () => void;
};

type ButtonIcon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

function iconForSystemImage(systemImage?: string): ButtonIcon | null {
  switch (systemImage) {
    case "plus":
      return Plus;
    case "chevron.left":
      return ChevronLeft;
    case "chevron.right":
      return ChevronRight;
    case "checkmark":
      return Check;
    case "square.and.arrow.up":
      return Share;
    case "arrow.up.forward.app":
      return ExternalLink;
    case "trash":
      return Trash2;
    default:
      return null;
  }
}

export function NativeButton({
  accessibilityLabel,
  color,
  disabled,
  foregroundColor,
  frame,
  fullWidth,
  role = "default",
  style,
  systemImage,
  title,
  variant = "bordered",
  onPress
}: NativeButtonProps) {
  const prominent = variant === "borderedProminent" || variant === "glassProminent";
  const Icon = iconForSystemImage(systemImage);
  const labelColor = foregroundColor ? String(foregroundColor) : prominent ? "#ffffff" : String(color ?? "#111111");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled}
      style={[
        styles.button,
        frame,
        fullWidth && styles.fullWidth,
        prominent && { backgroundColor: String(color ?? "#111111"), borderColor: String(color ?? "#111111") },
        role === "destructive" && styles.destructive,
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        {Icon ? <Icon color={role === "destructive" ? "#b91c1c" : labelColor} size={20} strokeWidth={iconStrokeWidth} /> : null}
        {title ? <Text style={[styles.label, { color: labelColor }, role === "destructive" && styles.destructiveLabel]}>{title}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: "rgba(0,0,0,0.16)",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center"
  },
  destructive: {
    borderColor: "rgba(220,38,38,0.35)"
  },
  destructiveLabel: {
    color: "#b91c1c"
  },
  disabled: {
    opacity: 0.55
  },
  fullWidth: {
    alignSelf: "stretch",
    minWidth: 0
  },
  label: {
    fontSize: 15,
    fontWeight: "700"
  }
});
