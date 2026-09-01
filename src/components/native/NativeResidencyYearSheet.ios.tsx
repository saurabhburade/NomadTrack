import { type NativeSyntheticEvent, requireNativeComponent, type StyleProp, StyleSheet, UIManager, type ViewProps, type ViewStyle } from "react-native";

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

type ConfirmEvent = NativeSyntheticEvent<{
  calendarYearMode: boolean;
  year: number;
}>;

type NativeResidencyYearSheetViewProps = ViewProps & {
  accentColorValue: string;
  accentForegroundColorValue: string;
  borderColorValue: string;
  calendarYearMode: boolean;
  cardColorValue: string;
  foregroundColorValue: string;
  menuGlassFillColorValue: string;
  mutedColorValue: string;
  pillColorValue: string;
  visible: boolean;
  year: number;
  onClose: () => void;
  onConfirm: (event: ConfirmEvent) => void;
};

type NativeResidencyYearSheetProps = {
  calendarYearMode: boolean;
  palette: NativeResidencyYearSheetPalette;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
  year: number;
  onClose: () => void;
  onConfirm: (year: number, calendarYearMode: boolean) => void;
};

export const isNativeResidencyYearSheetAvailable = UIManager.getViewManagerConfig?.("ResidencyYearSheetView") != null;

const ResidencyYearSheetView = isNativeResidencyYearSheetAvailable ? requireNativeComponent<NativeResidencyYearSheetViewProps>("ResidencyYearSheetView") : null;

export function NativeResidencyYearSheet({ calendarYearMode, palette, style, visible, year, onClose, onConfirm }: NativeResidencyYearSheetProps) {
  if (!ResidencyYearSheetView) return null;

  return (
    <ResidencyYearSheetView
      accentColorValue={palette.accent}
      accentForegroundColorValue={palette.accentForeground}
      borderColorValue={palette.border}
      calendarYearMode={calendarYearMode}
      cardColorValue={palette.card}
      foregroundColorValue={palette.foreground}
      menuGlassFillColorValue={palette.menuGlassFill}
      mutedColorValue={palette.muted}
      pillColorValue={palette.pill}
      style={[styles.host, style]}
      visible={visible}
      year={year}
      onClose={onClose}
      onConfirm={(event) => {
        onConfirm(event.nativeEvent.year, event.nativeEvent.calendarYearMode);
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
