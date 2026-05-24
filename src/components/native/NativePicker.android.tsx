import { Picker as ComposePicker } from "@expo/ui/jetpack-compose";
import { type ColorValue, type StyleProp, type ViewStyle } from "react-native";

type NativePickerVariant = "segmented" | "menu" | "inline" | "wheel" | "palette" | "radio";

type NativePickerProps = {
  color?: ColorValue;
  label?: string;
  options: string[];
  selectedIndex: number | null;
  style?: StyleProp<ViewStyle>;
  variant?: NativePickerVariant;
  onChange: (index: number) => void;
};

export function NativePicker({ color, options, selectedIndex, style, variant = "segmented", onChange }: NativePickerProps) {
  return (
    <ComposePicker
      color={color ? String(color) : undefined}
      options={options}
      selectedIndex={selectedIndex}
      style={style}
      variant={variant === "radio" ? "radio" : "segmented"}
      onOptionSelected={(event) => onChange(event.nativeEvent.index)}
    />
  );
}
