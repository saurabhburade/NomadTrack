import { requireNativeComponent, StyleSheet, UIManager, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

export type NativeAutomationGuideSheetPalette = {
  foreground: string;
  muted: string;
  card: string;
  pill: string;
  accent: string;
  accentForeground: string;
  border: string;
  menuGlassFill: string;
};

type NativeAutomationGuideSheetViewProps = ViewProps & {
  accentColorValue: string;
  accentForegroundColorValue: string;
  borderColorValue: string;
  cardColorValue: string;
  foregroundColorValue: string;
  menuGlassFillColorValue: string;
  mutedColorValue: string;
  pillColorValue: string;
  visible: boolean;
  onClose: () => void;
  onConfirmSetup: () => void;
  onOpenShortcuts: () => void;
};

type NativeAutomationGuideSheetProps = {
  palette: NativeAutomationGuideSheetPalette;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
  onClose: () => void;
  onConfirmSetup: () => void;
  onOpenShortcuts: () => void;
};

export const isNativeAutomationGuideSheetAvailable = UIManager.getViewManagerConfig?.("AutomationGuideSheetView") != null;

const AutomationGuideSheetView = isNativeAutomationGuideSheetAvailable
  ? requireNativeComponent<NativeAutomationGuideSheetViewProps>("AutomationGuideSheetView")
  : null;

export function NativeAutomationGuideSheet({ palette, style, visible, onClose, onConfirmSetup, onOpenShortcuts }: NativeAutomationGuideSheetProps) {
  if (!AutomationGuideSheetView) return null;

  return (
    <AutomationGuideSheetView
      accentColorValue={palette.accent}
      accentForegroundColorValue={palette.accentForeground}
      borderColorValue={palette.border}
      cardColorValue={palette.card}
      foregroundColorValue={palette.foreground}
      menuGlassFillColorValue={palette.menuGlassFill}
      mutedColorValue={palette.muted}
      pillColorValue={palette.pill}
      style={[styles.host, style]}
      visible={visible}
      onClose={onClose}
      onConfirmSetup={onConfirmSetup}
      onOpenShortcuts={onOpenShortcuts}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    height: 1,
    width: 1
  }
});
