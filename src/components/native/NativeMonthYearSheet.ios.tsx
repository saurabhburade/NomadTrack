import { requireNativeComponent, StyleSheet, UIManager, type NativeSyntheticEvent, type ViewProps } from "react-native";

export type NativeMonthYearSheetPalette = {
  foreground: string;
  muted: string;
  pill: string;
  accent: string;
  accentForeground: string;
  border: string;
  menuGlassFill: string;
};

type ConfirmEvent = NativeSyntheticEvent<{
  monthIndex: number;
  year: number;
}>;

type NativeMonthYearSheetViewProps = ViewProps & {
  accentColorValue: string;
  accentForegroundColorValue: string;
  borderColorValue: string;
  foregroundColorValue: string;
  menuGlassFillColorValue: string;
  monthIndex: number;
  mutedColorValue: string;
  pillColorValue: string;
  visible: boolean;
  year: number;
  onClose: () => void;
  onConfirm: (event: ConfirmEvent) => void;
};

type NativeMonthYearSheetProps = {
  monthIndex: number;
  palette: NativeMonthYearSheetPalette;
  visible: boolean;
  year: number;
  onClose: () => void;
  onConfirm: (monthIndex: number, year: number) => void;
};

export const isNativeMonthYearSheetAvailable = UIManager.getViewManagerConfig?.("MonthYearSheetView") != null;

const MonthYearSheetView = isNativeMonthYearSheetAvailable
  ? requireNativeComponent<NativeMonthYearSheetViewProps>("MonthYearSheetView")
  : null;

export function NativeMonthYearSheet({ monthIndex, palette, visible, year, onClose, onConfirm }: NativeMonthYearSheetProps) {
  if (!MonthYearSheetView) return null;

  return (
    <MonthYearSheetView
      accentColorValue={palette.accent}
      accentForegroundColorValue={palette.accentForeground}
      borderColorValue={palette.border}
      foregroundColorValue={palette.foreground}
      menuGlassFillColorValue={palette.menuGlassFill}
      monthIndex={monthIndex}
      mutedColorValue={palette.muted}
      pillColorValue={palette.pill}
      style={styles.host}
      visible={visible}
      year={year}
      onClose={onClose}
      onConfirm={(event) => {
        onConfirm(event.nativeEvent.monthIndex, event.nativeEvent.year);
      }}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    height: 1,
    width: 1
  }
});
