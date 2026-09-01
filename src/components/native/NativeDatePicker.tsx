import { type ColorValue, Pressable, type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";

type NativeDatePickerProps = {
  color?: ColorValue;
  date?: Date | string | null;
  style?: StyleProp<ViewStyle>;
  title?: string;
  onChange: (date: Date) => void;
};

export function NativeDatePicker({ color, date, style, title = "Select date", onChange }: NativeDatePickerProps) {
  const currentDate = date ? new Date(date) : new Date();

  return (
    <Pressable style={[styles.button, color ? { borderColor: color } : null, style]} onPress={() => onChange(currentDate)}>
      <Text style={[styles.text, color ? { color } : null]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: "rgba(142,142,147,0.32)",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  text: {
    color: "#0a84ff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0
  }
});
