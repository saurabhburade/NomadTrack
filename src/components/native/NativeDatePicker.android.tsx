import { DateTimePicker } from "@expo/ui/jetpack-compose";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

type NativeDatePickerProps = {
  color?: ColorValue;
  date?: Date | string | null;
  displayedComponents?: "date" | "hourAndMinute" | "dateAndTime";
  style?: StyleProp<ViewStyle>;
  title?: string;
  variant?: "wheel" | "automatic" | "graphical" | "compact" | "picker" | "input";
  onChange: (date: Date) => void;
};

export function NativeDatePicker({ color, date, displayedComponents = "date", style, variant = "picker", onChange }: NativeDatePickerProps) {
  return (
    <DateTimePicker
      color={color ? String(color) : undefined}
      displayedComponents={displayedComponents}
      initialDate={date ? new Date(date).toISOString() : null}
      showVariantToggle
      style={style}
      variant={variant === "input" ? "input" : "picker"}
      onDateSelected={onChange}
    />
  );
}
