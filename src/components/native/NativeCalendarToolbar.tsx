import type { StyleProp, ViewStyle } from "react-native";

export const isNativeCalendarToolbarAvailable = false;

export function NativeCalendarToolbar(_props: {
  foregroundColor: string;
  label: string;
  style?: StyleProp<ViewStyle>;
  onManualEntry: () => void;
  onMonthPress: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
}) {
  return null;
}
