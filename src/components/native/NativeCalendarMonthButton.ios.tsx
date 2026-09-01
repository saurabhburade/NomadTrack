import { ChevronRight } from "lucide-react-native";
import {
  type ColorValue,
  type NativeSyntheticEvent,
  Pressable,
  requireNativeComponent,
  type StyleProp,
  StyleSheet,
  Text,
  UIManager,
  View,
  type ViewProps,
  type ViewStyle
} from "react-native";
import { iconStrokeWidth } from "../../lib/colors";

type NativeCalendarMonthButtonProps = {
  accessibilityLabel?: string;
  color?: ColorValue;
  label: string;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
};

type CalendarMonthButtonViewProps = ViewProps & {
  label: string;
  tintColorValue: string;
  onPress: (event: NativeSyntheticEvent<Record<string, never>>) => void;
};

const hasCalendarMonthButtonView = UIManager.getViewManagerConfig?.("CalendarMonthButtonView") != null;
const CalendarMonthButtonView = hasCalendarMonthButtonView ? requireNativeComponent<CalendarMonthButtonViewProps>("CalendarMonthButtonView") : null;

export function NativeCalendarMonthButton({ accessibilityLabel, color, label, style, onPress }: NativeCalendarMonthButtonProps) {
  const tint = color ? String(color) : "#111111";

  if (!CalendarMonthButtonView) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[styles.fallbackButton, style]} onPress={onPress}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.fallbackLabel, { color: tint }]}>
          {label}
        </Text>
        <ChevronRight color={tint} size={20} strokeWidth={iconStrokeWidth} />
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.shell, style]}>
      <CalendarMonthButtonView label={label} style={styles.host} tintColorValue={tint} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  fallbackLabel: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "600"
  },
  host: {
    flex: 1
  },
  shell: {
    height: 48,
    justifyContent: "center",
    maxWidth: 220,
    minWidth: 164
  }
});
