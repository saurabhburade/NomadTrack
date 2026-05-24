import { DateTimePicker, Host } from "@expo/ui/swift-ui";
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

type NativeDatePickerProps = {
  color?: ColorValue;
  date?: Date | string | null;
  displayedComponents?: "date" | "hourAndMinute" | "dateAndTime";
  style?: StyleProp<ViewStyle>;
  title?: string;
  variant?: "wheel" | "automatic" | "graphical" | "compact";
  onChange: (date: Date) => void;
};

export function NativeDatePicker({ color, date, displayedComponents = "date", style, title, variant = "compact", onChange }: NativeDatePickerProps) {
  return (
    <View style={[styles.shell, style]}>
      <Host matchContents>
        <DateTimePicker
          color={color ? String(color) : undefined}
          displayedComponents={displayedComponents}
          initialDate={date ? new Date(date).toISOString() : null}
          title={title}
          variant={variant}
          onDateSelected={onChange}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 44
  }
});
