import { useMemo } from "react";
import {
  requireNativeComponent,
  StyleSheet,
  UIManager,
  type StyleProp,
  type ViewProps,
  type ViewStyle
} from "react-native";
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

type NativeReportPreviewSheetViewProps = ViewProps & {
  accentColorValue: string;
  accentForegroundColorValue: string;
  borderColorValue: string;
  cardColorValue: string;
  foregroundColorValue: string;
  isSharing: boolean;
  menuGlassFillColorValue: string;
  mutedColorValue: string;
  pillColorValue: string;
  reportJson: string;
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
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

export const isNativeReportPreviewSheetAvailable = UIManager.getViewManagerConfig?.("ReportPreviewSheetView") != null;

const ReportPreviewSheetView = isNativeReportPreviewSheetAvailable
  ? requireNativeComponent<NativeReportPreviewSheetViewProps>("ReportPreviewSheetView")
  : null;

export function NativeReportPreviewSheet({ isSharing, palette, report, style, visible, onClose, onShare }: NativeReportPreviewSheetProps) {
  const reportJson = useMemo(() => (report ? JSON.stringify(report) : ""), [report]);

  if (!ReportPreviewSheetView) return null;

  return (
    <ReportPreviewSheetView
      accentColorValue={palette.accent}
      accentForegroundColorValue={palette.accentForeground}
      borderColorValue={palette.border}
      cardColorValue={palette.card}
      foregroundColorValue={palette.foreground}
      isSharing={isSharing}
      menuGlassFillColorValue={palette.menuGlassFill}
      mutedColorValue={palette.muted}
      pillColorValue={palette.pill}
      reportJson={reportJson}
      style={[styles.host, style]}
      visible={visible}
      onClose={onClose}
      onShare={onShare}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    height: 1,
    width: 1
  }
});
