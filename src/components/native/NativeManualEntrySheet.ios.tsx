import { type NativeSyntheticEvent, requireNativeComponent, type StyleProp, StyleSheet, UIManager, type ViewProps, type ViewStyle } from "react-native";
import type { NativeEditDaySheetCountry } from "./NativeEditDaySheet";
import type { NativeManualEntryExistingRecord, NativeManualEntrySheetPalette } from "./NativeManualEntrySheet";

type ConfirmEvent = NativeSyntheticEvent<{
  countryCode: string;
  countryName: string;
  endDate: string;
  startDate: string;
}>;

type ClearEvent = NativeSyntheticEvent<{
  endDate: string;
  startDate: string;
}>;

type NativeManualEntrySheetViewProps = ViewProps & {
  actionPrimaryForegroundColorValue: string;
  actionSecondaryBorderColorValue: string;
  cardColorValue: string;
  chipFillColorValue: string;
  countryOptions: NativeEditDaySheetCountry[];
  errorBorderColorValue: string;
  errorFillColorValue: string;
  errorTextColorValue: string;
  existingRecords: NativeManualEntryExistingRecord[];
  foregroundColorValue: string;
  initialDate: string;
  inputBorderColorValue: string;
  inputFillColorValue: string;
  isSaving: boolean;
  menuGlassFillColorValue: string;
  mutedColorValue: string;
  placeholderColorValue: string;
  selectedBorderColorValue: string;
  selectedFillColorValue: string;
  selectedForegroundColorValue: string;
  visible: boolean;
  weekdayColorValue: string;
  onClose: () => void;
  onClear: (event: ClearEvent) => void;
  onConfirm: (event: ConfirmEvent) => void;
};

type NativeManualEntrySheetProps = {
  countries: NativeEditDaySheetCountry[];
  existingRecords: NativeManualEntryExistingRecord[];
  initialDate: string;
  palette: NativeManualEntrySheetPalette;
  isSaving?: boolean;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
  onClose: () => void;
  onClear: (entry: { startDate: string; endDate: string }) => void;
  onConfirm: (entry: { startDate: string; endDate: string; countryCode: string; countryName: string }) => void;
};

export const isNativeManualEntrySheetAvailable = UIManager.getViewManagerConfig?.("ManualEntrySheetView") != null;

const ManualEntrySheetView = isNativeManualEntrySheetAvailable ? requireNativeComponent<NativeManualEntrySheetViewProps>("ManualEntrySheetView") : null;

export function NativeManualEntrySheet({
  countries,
  existingRecords,
  initialDate,
  palette,
  isSaving = false,
  style,
  visible,
  onClose,
  onClear,
  onConfirm
}: NativeManualEntrySheetProps) {
  if (!ManualEntrySheetView) return null;

  return (
    <ManualEntrySheetView
      actionPrimaryForegroundColorValue={palette.actionPrimaryForeground}
      actionSecondaryBorderColorValue={palette.actionSecondaryBorder}
      cardColorValue={palette.card}
      chipFillColorValue={palette.chipFill}
      countryOptions={countries}
      errorBorderColorValue={palette.errorBorder}
      errorFillColorValue={palette.errorFill}
      errorTextColorValue={palette.errorText}
      existingRecords={existingRecords}
      foregroundColorValue={palette.foreground}
      initialDate={initialDate}
      inputBorderColorValue={palette.inputBorder}
      inputFillColorValue={palette.inputFill}
      isSaving={isSaving}
      menuGlassFillColorValue={palette.menuGlassFill}
      mutedColorValue={palette.muted}
      placeholderColorValue={palette.placeholder}
      selectedBorderColorValue={palette.selectedBorder}
      selectedFillColorValue={palette.selectedFill}
      selectedForegroundColorValue={palette.selectedForeground}
      style={[styles.host, style]}
      visible={visible}
      weekdayColorValue={palette.weekday}
      onClose={onClose}
      onClear={(event) => {
        onClear({
          endDate: event.nativeEvent.endDate,
          startDate: event.nativeEvent.startDate
        });
      }}
      onConfirm={(event) => {
        onConfirm({
          countryCode: event.nativeEvent.countryCode,
          countryName: event.nativeEvent.countryName,
          endDate: event.nativeEvent.endDate,
          startDate: event.nativeEvent.startDate
        });
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
