import { ChevronLeft, MoreHorizontal } from "lucide-react-native";
import { Pressable, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from "react-native";
import { iconStrokeWidth } from "../../lib/colors";
import { BlurReplaceText } from "../ui/blur-replace-text";

const YEAR_BUTTON_WIDTH = 132;

export type DashboardMenuAction = {
  systemImage?: string;
  title: string;
  onPress: () => void;
};

type NativeDashboardHeaderActionsProps = {
  accessibilityLabel?: string;
  color?: ColorValue;
  fiscalYearLabel: string;
  menuActions: DashboardMenuAction[];
  style?: StyleProp<ViewStyle>;
  trailingAction?: {
    accessibilityLabel?: string;
    systemImage: string;
    onPress: () => void;
  };
  onYearPress: () => void;
};

export function NativeDashboardHeaderActions({ accessibilityLabel, color, fiscalYearLabel, menuActions, style, trailingAction, onYearPress }: NativeDashboardHeaderActionsProps) {
  const tint = String(color ?? "#111111");

  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.row, style]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Change residency year" style={styles.yearButton} onPress={onYearPress}>
        <BlurReplaceText value={fiscalYearLabel} style={[styles.yearLabel, { color: tint }]} />
      </Pressable>
      {trailingAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={trailingAction.accessibilityLabel} style={styles.menuButton} onPress={trailingAction.onPress}>
          <ChevronLeft size={27} color={tint} strokeWidth={iconStrokeWidth} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open dashboard menu"
          hitSlop={{ top: 12, right: 18, bottom: 12, left: 12 }}
          style={styles.menuButton}
          onPress={() => menuActions[0]?.onPress()}
        >
          <MoreHorizontal size={27} color={tint} strokeWidth={iconStrokeWidth} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  yearButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    minWidth: YEAR_BUTTON_WIDTH,
    paddingHorizontal: 16
  },
  yearLabel: {
    fontSize: 18,
    fontWeight: "700"
  },
  menuButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  }
});
