import { Button as SwiftButton, ContextMenu, Host } from "@expo/ui/swift-ui";
import type { ButtonProps as SwiftButtonProps } from "@expo/ui/swift-ui";
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

export type NativeMenuAction = {
  role?: "default" | "cancel" | "destructive";
  systemImage?: SwiftButtonProps["systemImage"];
  title: string;
  onPress: () => void;
};

type NativeMenuProps = {
  accessibilityLabel?: string;
  actions: NativeMenuAction[];
  color?: ColorValue;
  controlSize?: SwiftButtonProps["controlSize"];
  frame?: SwiftButtonProps["frame"];
  style?: StyleProp<ViewStyle>;
  systemImage?: SwiftButtonProps["systemImage"];
  title?: string;
  variant?: SwiftButtonProps["variant"];
};

export function NativeMenu({ accessibilityLabel, actions, color, controlSize = "large", frame, style, systemImage, title, variant = "glass" }: NativeMenuProps) {
  const bleed = variant === "glass" || variant === "glassProminent" ? 8 : 0;
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
  const shellFrame = frame
    ? {
        width: frame.width,
        height: frame.height,
        minWidth: frame.width ?? frame.minWidth,
        minHeight: frame.height ?? frame.minHeight,
        maxWidth: frame.width ?? frame.maxWidth,
        maxHeight: frame.height ?? frame.maxHeight
      }
    : undefined;
  const hostFrame = frame
    ? {
        width: frame.width ? frame.width + bleed * 2 : undefined,
        height: frame.height ? frame.height + bleed * 2 : undefined,
        minWidth: frame.width ? frame.width + bleed * 2 : frame.minWidth,
        minHeight: frame.height ? frame.height + bleed * 2 : frame.minHeight
      }
    : undefined;
  const hostBleedStyle = bleed
    ? {
        marginHorizontal: -bleed,
        marginVertical: -bleed
      }
    : undefined;

  return (
    <View accessibilityLabel={accessibilityLabel ?? title} accessibilityRole="button" style={[styles.shell, shellFrame, style]}>
      <Host matchContents style={[hostFrame, hostBleedStyle]}>
        <ContextMenu activationMethod="singlePress">
          <ContextMenu.Items>
            {actions.map((action) => (
              <SwiftButton key={action.title} role={action.role ?? "default"} systemImage={action.systemImage} onPress={action.onPress}>
                {action.title}
              </SwiftButton>
            ))}
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <SwiftButton color={color ? String(color) : undefined} controlSize={controlSize} frame={fixedFrame} systemImage={systemImage} variant={variant}>
              {title}
            </SwiftButton>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexShrink: 0,
    minHeight: 44,
    minWidth: 0
  }
});
