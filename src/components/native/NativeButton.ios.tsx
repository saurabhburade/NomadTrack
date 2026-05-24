import { Button as SwiftButton, Host, HStack, Image, Spacer, Text } from "@expo/ui/swift-ui";
import type { ButtonProps as SwiftButtonProps } from "@expo/ui/swift-ui";
import { frame as swiftFrame } from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

type NativeButtonProps = {
  accessibilityLabel?: string;
  color?: ColorValue;
  controlSize?: SwiftButtonProps["controlSize"];
  disabled?: boolean;
  frame?: SwiftButtonProps["frame"];
  foregroundColor?: ColorValue;
  fullWidth?: boolean;
  role?: "default" | "cancel" | "destructive";
  style?: StyleProp<ViewStyle>;
  systemImage?: SwiftButtonProps["systemImage"];
  title?: string;
  variant?: "default" | "bordered" | "borderless" | "borderedProminent" | "plain" | "glass" | "glassProminent";
  onPress?: () => void;
};

export function NativeButton({ accessibilityLabel, color, controlSize = "large", disabled, foregroundColor, frame, fullWidth, role = "default", style, systemImage, title, variant = "bordered", onPress }: NativeButtonProps) {
  const fixedFrame = frame
    ? {
        ...frame,
        minWidth: frame.width ?? frame.minWidth,
        maxWidth: frame.width ?? frame.maxWidth,
        minHeight: frame.height ?? frame.minHeight,
        maxHeight: frame.height ?? frame.maxHeight,
        alignment: frame.alignment ?? "center"
      }
    : undefined;
  const fullWidthFrame = fullWidth
    ? {
        width: frame?.width,
        minHeight: frame?.height ?? frame?.minHeight ?? 50,
        maxWidth: frame?.width ? undefined : frame?.maxWidth,
        alignment: "center" as const
      }
    : undefined;

  return (
    <View accessibilityLabel={accessibilityLabel ?? title} accessibilityRole="button" style={[styles.shell, fullWidth ? styles.fullWidthShell : null, style]}>
      <Host matchContents={fullWidth ? { vertical: true, horizontal: false } : true} style={fullWidth ? styles.host : undefined}>
        <SwiftButton
          color={color ? String(color) : undefined}
          controlSize={controlSize}
          disabled={disabled}
          frame={fullWidth ? { minHeight: 50, ...frame } : fixedFrame}
          role={role}
          systemImage={fullWidth ? undefined : systemImage}
          variant={variant}
          onPress={onPress}
        >
          {fullWidth ? (
            <HStack alignment="center" modifiers={fullWidthFrame ? [swiftFrame(fullWidthFrame)] : undefined} spacing={7}>
              <Spacer minLength={0} />
              {systemImage ? <Image color={foregroundColor ? String(foregroundColor) : undefined} systemName={systemImage} size={17} /> : null}
              {title ? (
                <Text color={foregroundColor ? String(foregroundColor) : undefined} lineLimit={1} size={17} weight="semibold">
                  {title}
                </Text>
              ) : null}
              <Spacer minLength={0} />
            </HStack>
          ) : (
            title
          )}
        </SwiftButton>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: "stretch",
    width: "100%"
  },
  fullWidthShell: {
    alignSelf: "stretch",
    width: "100%"
  },
  shell: {
    minHeight: 44,
    minWidth: 0
  }
});
