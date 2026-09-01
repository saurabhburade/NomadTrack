import { type NativeSyntheticEvent, requireNativeComponent, type StyleProp, UIManager, type ViewProps, type ViewStyle } from "react-native";
import type { NativeCalendarMonthGridDayRecord, NativeCalendarMonthGridPalette, NativeCalendarMonthGridSummary } from "./NativeCalendarMonthGrid";

type DayPressEvent = NativeSyntheticEvent<{
  date: string;
}>;

type CalendarMonthGridViewProps = ViewProps & {
  accentColorValue: string;
  dayRecords: NativeCalendarMonthGridDayRecord[];
  foregroundColorValue: string;
  monthDate: string;
  selectedDate: string;
  showsSummary?: boolean;
  summaryAbroadDays?: number;
  summaryCardColorValue?: string;
  summaryCountryText?: string;
  summaryIndiaDays?: number;
  summaryInputBorderColorValue?: string;
  summaryInputFillColorValue?: string;
  summaryMutedColorValue?: string;
  summaryPendingDays?: number;
  summaryRecordedDays?: number;
  summaryStatusText?: string;
  summaryTotalDays?: number;
  summaryTravelDays?: number;
  weekdayColorValue: string;
  onDayPress: (event: DayPressEvent) => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

type NativeCalendarMonthGridProps = {
  dayRecords: NativeCalendarMonthGridDayRecord[];
  monthDate: string;
  palette: NativeCalendarMonthGridPalette;
  selectedDate: string;
  summary?: NativeCalendarMonthGridSummary;
  style?: StyleProp<ViewStyle>;
  onDayPress: (date: string) => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
};

const calendarMonthGridViewConfig = UIManager.getViewManagerConfig?.("CalendarMonthGridView") as { NativeProps?: Record<string, unknown> } | null | undefined;

export const isNativeCalendarMonthGridAvailable = calendarMonthGridViewConfig != null;
export const isNativeCalendarMonthGridSummaryAvailable = calendarMonthGridViewConfig?.NativeProps?.showsSummary != null;

const CalendarMonthGridView = isNativeCalendarMonthGridAvailable ? requireNativeComponent<CalendarMonthGridViewProps>("CalendarMonthGridView") : null;

export function NativeCalendarMonthGrid({
  dayRecords,
  monthDate,
  palette,
  selectedDate,
  summary,
  style,
  onDayPress,
  onNextMonth,
  onPreviousMonth
}: NativeCalendarMonthGridProps) {
  if (!CalendarMonthGridView) return null;

  return (
    <CalendarMonthGridView
      accentColorValue={palette.accent}
      dayRecords={dayRecords}
      foregroundColorValue={palette.foreground}
      monthDate={monthDate}
      selectedDate={selectedDate}
      showsSummary={summary != null}
      style={style}
      summaryAbroadDays={summary?.abroadDays ?? 0}
      summaryCardColorValue={palette.card ?? "transparent"}
      summaryCountryText={summary?.countryText ?? ""}
      summaryIndiaDays={summary?.indiaDays ?? 0}
      summaryInputBorderColorValue={palette.inputBorder ?? "transparent"}
      summaryInputFillColorValue={palette.inputFill ?? "transparent"}
      summaryMutedColorValue={palette.muted ?? palette.weekday}
      summaryPendingDays={summary?.pendingDays ?? 0}
      summaryRecordedDays={summary?.recordedDays ?? 0}
      summaryStatusText={summary?.statusText ?? ""}
      summaryTotalDays={summary?.totalDays ?? 0}
      summaryTravelDays={summary?.travelDays ?? 0}
      weekdayColorValue={palette.weekday}
      onDayPress={(event) => {
        onDayPress(event.nativeEvent.date);
      }}
      onNextMonth={onNextMonth}
      onPreviousMonth={onPreviousMonth}
    />
  );
}
