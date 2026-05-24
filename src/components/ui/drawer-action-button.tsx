import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View, type ColorValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { NativeButton } from "../native/NativeButton";

const ACTION_BUTTON_HEIGHT = 42;
const ACTION_BUTTON_HORIZONTAL_INSET = 14;

type DrawerActionButtonProps = {
  backgroundColor: ColorValue;
  borderColor: ColorValue;
  disabled?: boolean;
  foregroundColor: ColorValue;
  style?: StyleProp<ViewStyle>;
  systemImage?: string;
  title: string;
  onPress?: () => void;
};

function colorString(color: ColorValue) {
  return String(color);
}

export function DrawerActionButton({ backgroundColor, borderColor, disabled, foregroundColor, style, systemImage, title, onPress }: DrawerActionButtonProps) {
  const [buttonWidth, setButtonWidth] = useState<number>();
  const buttonBackgroundColor = colorString(backgroundColor);
  const buttonBorderColor = colorString(borderColor);
  const isDestructive = systemImage === "trash";
  const isProminent = !isDestructive && buttonBackgroundColor === buttonBorderColor;
  const lowerTitle = title.toLowerCase();
  const role = isDestructive ? "destructive" : lowerTitle === "cancel" || lowerTitle === "close" ? "cancel" : "default";
  const frame = buttonWidth ? { width: Math.max(0, buttonWidth - ACTION_BUTTON_HORIZONTAL_INSET * 2), height: ACTION_BUTTON_HEIGHT } : { minHeight: ACTION_BUTTON_HEIGHT, maxWidth: 10000 };
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0) {
      setButtonWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    }
  }, []);

  return (
    <View style={[styles.button, disabled ? styles.disabled : null, style]} onLayout={handleLayout}>
      <Pressable accessibilityLabel={title} accessibilityRole="button" disabled={disabled} style={[styles.edgeTapTarget, styles.leftEdgeTapTarget]} onPress={onPress} />
      <NativeButton
        accessibilityLabel={title}
        color={isProminent ? backgroundColor : foregroundColor}
        controlSize="small"
        disabled={disabled}
        foregroundColor={foregroundColor}
        frame={frame}
        fullWidth
        role={role}
        style={styles.nativeButton}
        systemImage={systemImage}
        title={title}
        variant={isProminent ? "glassProminent" : "glass"}
        onPress={onPress}
      />
      <Pressable accessibilityLabel={title} accessibilityRole="button" disabled={disabled} style={[styles.edgeTapTarget, styles.rightEdgeTapTarget]} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "stretch",
    height: ACTION_BUTTON_HEIGHT,
    minWidth: 0,
    paddingHorizontal: ACTION_BUTTON_HORIZONTAL_INSET
  },
  disabled: {
    opacity: 0.48
  },
  edgeTapTarget: {
    bottom: 0,
    position: "absolute",
    top: 0,
    width: ACTION_BUTTON_HORIZONTAL_INSET,
    zIndex: 2
  },
  leftEdgeTapTarget: {
    left: 0
  },
  nativeButton: {
    alignSelf: "center",
    minWidth: 0,
    width: "100%"
  },
  rightEdgeTapTarget: {
    right: 0
  }
});
