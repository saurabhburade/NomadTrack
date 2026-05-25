import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import { NativeProgress } from "../native/NativeProgress";
import { BlurReplaceText } from "../ui/blur-replace-text";
import { iconStrokeWidth } from "../../lib/colors";
import type { BackupProgress } from "../../services/backup/driveBackup";

export type BackupProgressDialogPalette = {
  backdrop: string;
  border: string;
  foreground: string;
  muted: string;
  surface: string;
  tint: string;
  track: string;
};

type BackupProgressDialogProps = {
  palette: BackupProgressDialogPalette;
  progress: BackupProgress | null;
  visible: boolean;
};

export function BackupProgressDialog({ palette, progress, visible }: BackupProgressDialogProps) {
  if (!progress) return null;

  const completedCount = progress.items.filter((item) => item.status === "complete").length;
  const totalCount = Math.max(1, progress.items.length);

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: palette.backdrop }]}>
        <View style={[styles.dialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.header}>
            <ActivityIndicator color={palette.tint} size="small" />
            <View style={styles.headerCopy}>
              <BlurReplaceText
                containerStyle={styles.titleStage}
                numberOfLines={1}
                value={progress.title}
                style={[styles.title, { color: palette.foreground }]}
              />
              <BlurReplaceText
                containerStyle={styles.messageStage}
                numberOfLines={2}
                value={progress.message}
                style={[styles.message, { color: palette.muted }]}
              />
            </View>
          </View>

          <NativeProgress
            color={palette.tint}
            progress={completedCount / totalCount}
            variant="linear"
            style={styles.progress}
            trackColor={palette.track}
          />

          <ScrollView style={styles.items} contentContainerStyle={styles.itemsContent} showsVerticalScrollIndicator={false}>
            {progress.items.map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemIcon}>
                  {item.status === "complete" ? (
                    <CheckCircle2 size={18} color={palette.tint} strokeWidth={iconStrokeWidth} />
                  ) : item.status === "active" ? (
                    <ActivityIndicator color={palette.tint} size="small" />
                  ) : (
                    <View style={[styles.pendingDot, { backgroundColor: palette.track }]} />
                  )}
                </View>
                <BlurReplaceText
                  containerStyle={styles.itemLabelStage}
                  numberOfLines={2}
                  value={item.label}
                  style={[styles.itemLabel, { color: item.status === "pending" ? palette.muted : palette.foreground }]}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 22
  },
  dialog: {
    borderCurve: "continuous",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 420,
    padding: 18,
    width: "100%"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  headerCopy: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0
  },
  item: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 30
  },
  itemIcon: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: "left",
    textAlignVertical: "center"
  },
  itemLabelStage: {
    alignItems: "flex-start",
    flex: 1,
    justifyContent: "center",
    minHeight: 24,
    minWidth: 0
  },
  items: {
    maxHeight: 210
  },
  itemsContent: {
    gap: 8,
    paddingTop: 12
  },
  message: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 17,
    marginTop: 2,
    textAlign: "left"
  },
  messageStage: {
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: 36
  },
  pendingDot: {
    borderRadius: 999,
    height: 8,
    width: 8
  },
  progress: {
    marginTop: 16
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 24,
    textAlign: "left"
  },
  titleStage: {
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: 24
  }
});
