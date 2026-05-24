import { Switch as ComposeSwitch } from "@expo/ui/jetpack-compose";
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

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

export function NativeSwitch({ disabled = false, offColor, onColor, style, thumbColor, value, onValueChange }: NativeSwitchProps) {
  return (
    <View pointerEvents={disabled ? "none" : "auto"} style={[styles.shell, disabled && styles.disabled, style]}>
      <ComposeSwitch
        elementColors={{
          checkedThumbColor: thumbColor ? String(thumbColor) : undefined,
          checkedTrackColor: String(onColor),
          uncheckedThumbColor: thumbColor ? String(thumbColor) : undefined,
          uncheckedTrackColor: offColor ? String(offColor) : undefined
        }}
        value={value}
        onValueChange={onValueChange}
      />
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
