import { type ColorValue, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

export type NativeMenuAction = {
  role?: "default" | "cancel" | "destructive";
  systemImage?: string;
  title: string;
  onPress: () => void;
};

type NativeMenuProps = {
  accessibilityLabel?: string;
  actions: NativeMenuAction[];
  color?: ColorValue;
  controlSize?: "mini" | "small" | "regular" | "large" | "extraLarge";
  frame?: { width?: number; height?: number; minHeight?: number; maxWidth?: number };
  style?: StyleProp<ViewStyle>;
  systemImage?: string;
  title?: string;
  variant?: "default" | "bordered" | "borderless" | "borderedProminent" | "plain" | "glass" | "glassProminent";
};

export function NativeMenu({ accessibilityLabel, actions, color, frame, style, title }: NativeMenuProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      style={[styles.button, frame, style]}
      onPress={() => actions[0]?.onPress()}
    >
      <View style={styles.content}>
        <Text style={[styles.label, { color: String(color ?? "#111111") }]}>{title ?? "Menu"}</Text>
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
    justifyContent: "center"
  },
  label: {
    fontSize: 15,
    fontWeight: "700"
  }
});
