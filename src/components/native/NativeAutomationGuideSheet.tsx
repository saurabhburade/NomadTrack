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

type NativeAutomationGuideSheetProps = {
  palette: NativeAutomationGuideSheetPalette;
  visible: boolean;
  onClose: () => void;
  onConfirmSetup: () => void;
  onOpenShortcuts: () => void;
};

export const isNativeAutomationGuideSheetAvailable = false;

export function NativeAutomationGuideSheet(_props: NativeAutomationGuideSheetProps) {
  return null;
}
