import type { StyleProp, ViewStyle } from "react-native";

export type NativeCalendarMonthGridDayRecord = {
  date: string;
  countryCode: string;
};

export type NativeCalendarMonthGridPalette = {
  accent: string;
  foreground: string;
  weekday: string;
};

export const isNativeCalendarMonthGridAvailable = false;

export function NativeCalendarMonthGrid(_props: {
  dayRecords: NativeCalendarMonthGridDayRecord[];
  monthDate: string;
  palette: NativeCalendarMonthGridPalette;
  selectedDate: string;
  style?: StyleProp<ViewStyle>;
  onDayPress: (date: string) => void;
}) {
  return null;
}
