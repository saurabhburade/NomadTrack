import { requireNativeComponent, StyleSheet, UIManager, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

type CalendarToolbarViewProps = ViewProps & {
  foregroundColorValue: string;
  monthLabel: string;
  onManualEntry: () => void;
  onMonthPress: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

type NativeCalendarToolbarProps = {
  foregroundColor: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  onManualEntry: () => void;
  onMonthPress: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

export const isNativeCalendarToolbarAvailable = UIManager.getViewManagerConfig?.("CalendarToolbarView") != null;

const CalendarToolbarView = isNativeCalendarToolbarAvailable
  ? requireNativeComponent<CalendarToolbarViewProps>("CalendarToolbarView")
  : null;

export function NativeCalendarToolbar({
  foregroundColor,
  label,
  style,
  onManualEntry,
  onMonthPress,
  onNextMonth,
  onPreviousMonth
}: NativeCalendarToolbarProps) {
  if (!CalendarToolbarView) return null;

  return (
    <CalendarToolbarView
      foregroundColorValue={foregroundColor}
      monthLabel={label}
      style={[styles.host, style]}
      onManualEntry={onManualEntry}
      onMonthPress={onMonthPress}
      onNextMonth={onNextMonth}
      onPreviousMonth={onPreviousMonth}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    minHeight: 136,
    width: "100%"
  }
});
