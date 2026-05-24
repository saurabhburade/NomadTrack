import {
  requireNativeComponent,
  UIManager,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle
} from "react-native";
import type { NativeCalendarMonthGridDayRecord, NativeCalendarMonthGridPalette } from "./NativeCalendarMonthGrid";

type DayPressEvent = NativeSyntheticEvent<{
  date: string;
}>;

type CalendarMonthGridViewProps = ViewProps & {
  accentColorValue: string;
  dayRecords: NativeCalendarMonthGridDayRecord[];
  foregroundColorValue: string;
  monthDate: string;
  selectedDate: string;
  weekdayColorValue: string;
  onDayPress: (event: DayPressEvent) => void;
};

type NativeCalendarMonthGridProps = {
  dayRecords: NativeCalendarMonthGridDayRecord[];
  monthDate: string;
  palette: NativeCalendarMonthGridPalette;
  selectedDate: string;
  style?: StyleProp<ViewStyle>;
  onDayPress: (date: string) => void;
};

export const isNativeCalendarMonthGridAvailable = UIManager.getViewManagerConfig?.("CalendarMonthGridView") != null;

const CalendarMonthGridView = isNativeCalendarMonthGridAvailable
  ? requireNativeComponent<CalendarMonthGridViewProps>("CalendarMonthGridView")
  : null;

export function NativeCalendarMonthGrid({
  dayRecords,
  monthDate,
  palette,
  selectedDate,
  style,
  onDayPress
}: NativeCalendarMonthGridProps) {
  if (!CalendarMonthGridView) return null;

  return (
    <CalendarMonthGridView
      accentColorValue={palette.accent}
      dayRecords={dayRecords}
      foregroundColorValue={palette.foreground}
      monthDate={monthDate}
      selectedDate={selectedDate}
      style={style}
      weekdayColorValue={palette.weekday}
      onDayPress={(event) => {
        onDayPress(event.nativeEvent.date);
      }}
    />
  );
}
