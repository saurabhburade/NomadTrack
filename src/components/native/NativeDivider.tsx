import { type ColorValue, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

type NativeDividerProps = {
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function NativeDivider({ color, style }: NativeDividerProps) {
  return <View style={[styles.divider, color ? { backgroundColor: color } : null, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth
  }
});
