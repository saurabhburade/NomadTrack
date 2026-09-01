import type { StyleProp, ViewStyle } from "react-native";
import type { NativeEditDaySheetCountry, NativeEditDaySheetPalette } from "./NativeEditDaySheet";

export type NativeManualEntryExistingRecord = {
  countryCode: string;
  date: string;
};

export type NativeManualEntrySheetPalette = NativeEditDaySheetPalette & {
  weekday: string;
};

export const isNativeManualEntrySheetAvailable = false;

export function NativeManualEntrySheet(_props: {
  countries: NativeEditDaySheetCountry[];
  existingRecords: NativeManualEntryExistingRecord[];
  initialDate: string;
  isSaving?: boolean;
  palette: NativeManualEntrySheetPalette;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
  onClose: () => void;
  onClear: (entry: { startDate: string; endDate: string }) => void;
  onConfirm: (entry: { startDate: string; endDate: string; countryCode: string; countryName: string }) => void;
}) {
  return null;
}
