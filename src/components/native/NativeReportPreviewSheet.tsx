import type { StyleProp, ViewStyle } from "react-native";
import type { TravelReportPreview } from "../../services/export/reportPdf";

export type NativeReportPreviewSheetPalette = {
  foreground: string;
  muted: string;
  card: string;
  pill: string;
  accent: string;
  accentForeground: string;
  border: string;
  menuGlassFill: string;
};

type NativeReportPreviewSheetProps = {
  isSharing: boolean;
  palette: NativeReportPreviewSheetPalette;
  report: TravelReportPreview | null;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
};

export const isNativeReportPreviewSheetAvailable = false;

export function NativeReportPreviewSheet(_props: NativeReportPreviewSheetProps) {
  return null;
}
