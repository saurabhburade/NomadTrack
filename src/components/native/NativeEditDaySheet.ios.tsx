import { type NativeSyntheticEvent, requireNativeComponent, type StyleProp, StyleSheet, UIManager, type ViewProps, type ViewStyle } from "react-native";
import type { NativeEditDaySheetCountry, NativeEditDaySheetPalette } from "./NativeEditDaySheet";

type ConfirmEvent = NativeSyntheticEvent<{
  countryCode: string;
  countryName: string;
  date: string;
  originalDate: string;
}>;

type DeleteEvent = NativeSyntheticEvent<{
  date: string;
}>;

type NativeEditDaySheetViewProps = ViewProps & {
  actionPrimaryFillColorValue: string;
  actionPrimaryForegroundColorValue: string;
  actionSecondaryBorderColorValue: string;
  actionSecondaryFillColorValue: string;
  canDelete: boolean;
  cardColorValue: string;
  chipFillColorValue: string;
  countryOptions: NativeEditDaySheetCountry[];
  errorBorderColorValue: string;
  errorFillColorValue: string;
  errorTextColorValue: string;
  foregroundColorValue: string;
  initialCountryInput: string;
  initialDate: string;
  inputBorderColorValue: string;
  inputFillColorValue: string;
  menuGlassFillColorValue: string;
  mutedColorValue: string;
  placeholderColorValue: string;
  selectedBorderColorValue: string;
  selectedFillColorValue: string;
  selectedForegroundColorValue: string;
  visible: boolean;
  onClose: () => void;
  onConfirm: (event: ConfirmEvent) => void;
  onDelete: (event: DeleteEvent) => void;
};

type NativeEditDaySheetProps = {
  canDelete: boolean;
  countries: NativeEditDaySheetCountry[];
  initialCountryInput: string;
  initialDate: string;
  palette: NativeEditDaySheetPalette;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
  onClose: () => void;
  onConfirm: (entry: { originalDate: string; date: string; countryCode: string; countryName: string }) => void;
  onDelete: (date: string) => void;
};

export const isNativeEditDaySheetAvailable = UIManager.getViewManagerConfig?.("EditDaySheetView") != null;

const EditDaySheetView = isNativeEditDaySheetAvailable ? requireNativeComponent<NativeEditDaySheetViewProps>("EditDaySheetView") : null;

export function NativeEditDaySheet({
  canDelete,
  countries,
  initialCountryInput,
  initialDate,
  palette,
  style,
  visible,
  onClose,
  onConfirm,
  onDelete
}: NativeEditDaySheetProps) {
  if (!EditDaySheetView) return null;

  return (
    <EditDaySheetView
      actionPrimaryFillColorValue={palette.actionPrimaryFill}
      actionPrimaryForegroundColorValue={palette.actionPrimaryForeground}
      actionSecondaryBorderColorValue={palette.actionSecondaryBorder}
      actionSecondaryFillColorValue={palette.actionSecondaryFill}
      canDelete={canDelete}
      cardColorValue={palette.card}
      chipFillColorValue={palette.chipFill}
      countryOptions={countries}
      errorBorderColorValue={palette.errorBorder}
      errorFillColorValue={palette.errorFill}
      errorTextColorValue={palette.errorText}
      foregroundColorValue={palette.foreground}
      initialCountryInput={initialCountryInput}
      initialDate={initialDate}
      inputBorderColorValue={palette.inputBorder}
      inputFillColorValue={palette.inputFill}
      menuGlassFillColorValue={palette.menuGlassFill}
      mutedColorValue={palette.muted}
      placeholderColorValue={palette.placeholder}
      selectedBorderColorValue={palette.selectedBorder}
      selectedFillColorValue={palette.selectedFill}
      selectedForegroundColorValue={palette.selectedForeground}
      style={[styles.host, style]}
      visible={visible}
      onClose={onClose}
      onConfirm={(event) => {
        onConfirm({
          countryCode: event.nativeEvent.countryCode,
          countryName: event.nativeEvent.countryName,
          date: event.nativeEvent.date,
          originalDate: event.nativeEvent.originalDate
        });
      }}
      onDelete={(event) => {
        onDelete(event.nativeEvent.date);
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
