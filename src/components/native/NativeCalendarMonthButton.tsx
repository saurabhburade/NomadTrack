import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, type ColorValue, type StyleProp, type ViewStyle } from "react-native";
import { iconStrokeWidth } from "../../lib/colors";

type NativeCalendarMonthButtonProps = {
  accessibilityLabel?: string;
  color?: ColorValue;
  label: string;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
};

export function NativeCalendarMonthButton({ accessibilityLabel, color, label, style, onPress }: NativeCalendarMonthButtonProps) {
  const tint = color ? String(color) : "#111111";

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[styles.button, style]} onPress={onPress}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.label, { color: tint }]}>
        {label}
      </Text>
      <ChevronRight color={tint} size={20} strokeWidth={iconStrokeWidth} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    height: 40,
    justifyContent: "center",
    minWidth: 164,
    paddingHorizontal: 16
  },
  label: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "600"
  }
});
