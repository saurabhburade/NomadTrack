import type { ButtonProps as SwiftButtonProps } from "@expo/ui/swift-ui";
import { ChevronLeft } from "lucide-react-native";
import {
  type ColorValue,
  type NativeSyntheticEvent,
  Pressable,
  requireNativeComponent,
  type StyleProp,
  StyleSheet,
  UIManager,
  View,
  type ViewProps,
  type ViewStyle
} from "react-native";
import { iconStrokeWidth } from "../../lib/colors";
import { BlurReplaceText } from "../ui/blur-replace-text";
import { NativeMenu } from "./NativeMenu";

const YEAR_BUTTON_WIDTH = 108;
const MENU_BUTTON_SIZE = 48;
const HEADER_ACTION_GAP = 10;

export type DashboardMenuAction = {
  systemImage?: SwiftButtonProps["systemImage"];
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
    systemImage: SwiftButtonProps["systemImage"];
    onPress: () => void;
  };
  onYearPress: () => void;
};

type MenuActionEvent = NativeSyntheticEvent<{ index: number }>;

type DashboardToolbarViewProps = ViewProps & {
  fiscalYearLabel: string;
  tintColorValue: string;
  menuActionTitles: string[];
  menuActionSystemImages: Array<string | null>;
  trailingActionAccessibilityLabel?: string;
  trailingActionSystemImage?: string | null;
  onMenuAction: (event: MenuActionEvent) => void;
  onTrailingActionPress?: () => void;
  onYearPress: () => void;
};

const hasDashboardToolbarView = UIManager.getViewManagerConfig?.("DashboardToolbarView") != null;
const DashboardToolbarView = hasDashboardToolbarView ? requireNativeComponent<DashboardToolbarViewProps>("DashboardToolbarView") : null;

export function NativeDashboardHeaderActions({
  accessibilityLabel,
  color,
  fiscalYearLabel,
  menuActions,
  style,
  trailingAction,
  onYearPress
}: NativeDashboardHeaderActionsProps) {
  const tint = color ? String(color) : "#111111";

  if (!DashboardToolbarView) {
    return (
      <View accessibilityLabel={accessibilityLabel} style={[styles.fallbackRow, style]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change residency year" style={styles.yearButton} onPress={onYearPress}>
          <BlurReplaceText value={fiscalYearLabel} style={[styles.yearLabel, { color: tint }]} />
        </Pressable>
        {trailingAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trailingAction.accessibilityLabel}
            style={styles.iconButton}
            onPress={trailingAction.onPress}
          >
            <ChevronLeft size={27} color={tint} strokeWidth={iconStrokeWidth} />
          </Pressable>
        ) : (
          <NativeMenu
            accessibilityLabel="Open dashboard menu"
            actions={menuActions}
            color={tint}
            frame={{ width: 38, height: 38 }}
            style={styles.menuHitArea}
            systemImage="ellipsis"
            variant="glass"
          />
        )}
      </View>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.shell, style]}>
      <DashboardToolbarView
        fiscalYearLabel={fiscalYearLabel}
        menuActionSystemImages={menuActions.map((action) => action.systemImage ?? null)}
        menuActionTitles={menuActions.map((action) => action.title)}
        style={styles.host}
        tintColorValue={tint}
        trailingActionAccessibilityLabel={trailingAction?.accessibilityLabel}
        trailingActionSystemImage={trailingAction?.systemImage ?? null}
        onMenuAction={(event) => {
          menuActions[event.nativeEvent.index]?.onPress();
        }}
        onTrailingActionPress={trailingAction?.onPress}
        onYearPress={onYearPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: HEADER_ACTION_GAP
  },
  host: {
    marginHorizontal: -8,
    marginVertical: -8,
    minHeight: MENU_BUTTON_SIZE + 16,
    minWidth: YEAR_BUTTON_WIDTH + MENU_BUTTON_SIZE + HEADER_ACTION_GAP + 16
  },
  menuHitArea: {
    height: MENU_BUTTON_SIZE,
    width: MENU_BUTTON_SIZE
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  shell: {
    flexShrink: 0,
    minHeight: MENU_BUTTON_SIZE,
    minWidth: YEAR_BUTTON_WIDTH + MENU_BUTTON_SIZE + HEADER_ACTION_GAP
  },
  yearButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    minWidth: YEAR_BUTTON_WIDTH,
    paddingHorizontal: 14
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: "700"
  }
});
