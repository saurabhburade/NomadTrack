import { Host, Switch as SwiftSwitch } from "@expo/ui/swift-ui";
import { type ColorValue, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

type NativeSwitchProps = {
  disabled?: boolean;
  iosBackgroundColor?: ColorValue;
  offColor?: ColorValue;
  onColor: ColorValue;
  style?: StyleProp<ViewStyle>;
  thumbColor?: ColorValue;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function NativeSwitch({ disabled = false, onColor, style, value, onValueChange }: NativeSwitchProps) {
  return (
    <View pointerEvents={disabled ? "none" : "auto"} style={[styles.shell, disabled && styles.disabled, style]}>
      <Host matchContents>
        <SwiftSwitch color={String(onColor)} value={value} onValueChange={onValueChange} />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.55
  },
  shell: {
    minHeight: 34,
    minWidth: 52
  }
});
