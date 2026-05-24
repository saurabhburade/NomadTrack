export type NativeResidencyYearSheetPalette = {
  foreground: string;
  muted: string;
  card: string;
  pill: string;
  accent: string;
  accentForeground: string;
  border: string;
  menuGlassFill: string;
};

type NativeResidencyYearSheetProps = {
  calendarYearMode: boolean;
  palette: NativeResidencyYearSheetPalette;
  visible: boolean;
  year: number;
  onClose: () => void;
  onConfirm: (year: number, calendarYearMode: boolean) => void;
};

export const isNativeResidencyYearSheetAvailable = false;

export function NativeResidencyYearSheet(_props: NativeResidencyYearSheetProps) {
  return null;
}
