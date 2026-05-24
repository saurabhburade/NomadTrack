import { Switch, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

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

export function NativeSwitch({ disabled, iosBackgroundColor, offColor, onColor, style, thumbColor, value, onValueChange }: NativeSwitchProps) {
  return (
    <Switch
      disabled={disabled}
      ios_backgroundColor={iosBackgroundColor ?? offColor}
      style={style}
      thumbColor={thumbColor}
      trackColor={{ false: offColor, true: onColor }}
      value={value}
      onValueChange={onValueChange}
    />
  );
}
