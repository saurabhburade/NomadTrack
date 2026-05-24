import type { StyleProp, ViewStyle } from "react-native";

export type NativeEditDaySheetCountry = {
  code: string;
  name: string;
};

export type NativeEditDaySheetPalette = {
  actionPrimaryFill: string;
  actionPrimaryForeground: string;
  actionSecondaryBorder: string;
  actionSecondaryFill: string;
  card: string;
  chipFill: string;
  errorBorder: string;
  errorFill: string;
  errorText: string;
  foreground: string;
  inputBorder: string;
  inputFill: string;
  menuGlassFill: string;
  muted: string;
  placeholder: string;
  selectedBorder: string;
  selectedFill: string;
  selectedForeground: string;
};

export const isNativeEditDaySheetAvailable = false;

export function NativeEditDaySheet(_props: {
  canDelete: boolean;
  countries: NativeEditDaySheetCountry[];
  initialCountryInput: string;
  initialDate: string;
  palette: NativeEditDaySheetPalette;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
  onClose: () => void;
  onConfirm: (entry: {
    originalDate: string;
    date: string;
    countryCode: string;
    countryName: string;
  }) => void;
  onDelete: (date: string) => void;
}) {
  return null;
}
