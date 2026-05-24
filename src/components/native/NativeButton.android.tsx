import { Button as ComposeButton } from "@expo/ui/jetpack-compose";
import type { ButtonProps as ComposeButtonProps } from "@expo/ui/jetpack-compose";
import { type ColorValue, type StyleProp, type ViewStyle } from "react-native";

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
  systemImage?: ComposeButtonProps["leadingIcon"];
  title?: string;
  variant?: "default" | "bordered" | "borderless" | "borderedProminent" | "plain" | "glass" | "glassProminent";
  onPress?: () => void;
};

function mapVariant(variant: NativeButtonProps["variant"]) {
  if (variant === "borderless" || variant === "plain") return "borderless";
  if (variant === "bordered") return "outlined";
  if (variant === "borderedProminent" || variant === "glassProminent") return "default";
  return "bordered";
}

export function NativeButton({ color, disabled, frame, fullWidth, role, style, systemImage, title, variant = "bordered", onPress }: NativeButtonProps) {
  return (
    <ComposeButton
      color={color ? String(color) : undefined}
      disabled={disabled}
      leadingIcon={systemImage}
      style={[fullWidth && styles.fullWidth, frame, style]}
      variant={role === "destructive" ? "outlined" : mapVariant(variant)}
      onPress={onPress}
    >
      {title ?? ""}
    </ComposeButton>
  );
}

const styles = {
  fullWidth: {
    alignSelf: "stretch",
    minWidth: 0
  }
} as const;
