import { Divider, Host } from "@expo/ui/swift-ui";
import { type ColorValue, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

type NativeDividerProps = {
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function NativeDivider({ color, style }: NativeDividerProps) {
  return (
    <View style={[styles.shell, color ? { backgroundColor: color } : null, style]}>
      <Host matchContents>
        <Divider />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: StyleSheet.hairlineWidth
  }
});
