import { Host, Picker as SwiftPicker } from "@expo/ui/swift-ui";
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

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

export function NativePicker({ color, label, options, selectedIndex, style, variant = "segmented", onChange }: NativePickerProps) {
  return (
    <View style={[styles.shell, style]}>
      <Host matchContents>
        <SwiftPicker
          color={color ? String(color) : undefined}
          label={label}
          options={options}
          selectedIndex={selectedIndex}
          variant={variant === "radio" ? "inline" : variant}
          onOptionSelected={(event) => onChange(event.nativeEvent.index)}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 36
  }
});
