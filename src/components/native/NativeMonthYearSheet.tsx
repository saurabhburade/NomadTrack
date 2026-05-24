export const isNativeMonthYearSheetAvailable = false;

export function NativeMonthYearSheet(_props: {
  monthIndex: number;
  palette: {
    foreground: string;
    muted: string;
    pill: string;
    accent: string;
    accentForeground: string;
    border: string;
    menuGlassFill: string;
  };
  visible: boolean;
  year: number;
  onClose: () => void;
  onConfirm: (monthIndex: number, year: number) => void;
}) {
  return null;
}
