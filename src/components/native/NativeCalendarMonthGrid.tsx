import type { StyleProp, ViewStyle } from "react-native";

export type NativeCalendarMonthGridDayRecord = {
  date: string;
  countryCode: string;
};

export type NativeCalendarMonthGridPalette = {
  accent: string;
  card?: string;
  foreground: string;
  inputBorder?: string;
  inputFill?: string;
  muted?: string;
  weekday: string;
};

export type NativeCalendarMonthGridSummary = {
  abroadDays: number;
  countryText: string;
  indiaDays: number;
  pendingDays: number;
  recordedDays: number;
  statusText: string;
  totalDays: number;
  travelDays: number;
};

export const isNativeCalendarMonthGridAvailable = false;
export const isNativeCalendarMonthGridSummaryAvailable = false;

export function NativeCalendarMonthGrid(_props: {
  dayRecords: NativeCalendarMonthGridDayRecord[];
  monthDate: string;
  palette: NativeCalendarMonthGridPalette;
  selectedDate: string;
  summary?: NativeCalendarMonthGridSummary;
  style?: StyleProp<ViewStyle>;
  onDayPress: (date: string) => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
}) {
  return null;
}
