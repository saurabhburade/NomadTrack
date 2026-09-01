import { type ColorValue, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

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

export function NativePicker({ color, options, selectedIndex, style, onChange }: NativePickerProps) {
  const activeColor = String(color ?? "#111111");
  return (
    <View style={[styles.segmented, style]}>
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={`${option}-${index}`}
            accessibilityRole="button"
            accessibilityState={selected ? { selected: true } : undefined}
            style={[styles.option, selected && { backgroundColor: activeColor }]}
            onPress={() => onChange(index)}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "700"
  },
  option: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 8
  },
  segmented: {
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 3,
    padding: 3
  },
  selectedLabel: {
    color: "#ffffff"
  }
});
