import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BlurView } from "expo-blur";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import { Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing as ReanimatedEasing, Extrapolation, interpolate, interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { iconStrokeWidth } from "../lib/colors";
import { LiquidGlassLayer } from "./native/LiquidGlassLayer";
import { NativeBottomSheet } from "./native/NativeBottomSheet";
import { NativePicker } from "./native/NativePicker";
import { NativeResidencyYearSheet, isNativeResidencyYearSheetAvailable } from "./native/NativeResidencyYearSheet";
import { DrawerActionButton } from "./ui/drawer-action-button";
import { Text } from "./ui/text";

export type YearSelectorPalette = {
  foreground: string;
  muted: string;
  border: string;
  card: string;
  pill: string;
  accent: string;
  accentForeground: string;
  blurTint: "dark" | "light";
  drawerBackdrop: string;
  glassFill: string;
  menuGlassFill: string;
  glassHighlight: string;
  glassLowlight: string;
  glassBorder: string;
  glassBorderActive: string;
  glassRim: string;
  glassShadow: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HeaderGlassButton({
  accessibilityLabel,
  active = false,
  children,
  palette,
  style,
  onPress
}: {
  accessibilityLabel: string;
  active?: boolean;
  children: ReactNode;
  palette: YearSelectorPalette;
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
}) {
  const pressProgress = useSharedValue(0);
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, {
      duration: 190,
      easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
    });
  }, [active, activeProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const glow = Math.max(pressProgress.value, activeProgress.value);

    return {
      borderColor: interpolateColor(glow, [0, 1], [palette.glassBorder, palette.glassBorderActive]),
      opacity: interpolate(pressProgress.value, [0, 1], [1, 0.9]),
      shadowOpacity: interpolate(glow, [0, 1], [0.14, 0.28]),
      transform: [
        { scale: interpolate(pressProgress.value, [0, 1], [1, 0.95]) },
        { translateY: interpolate(pressProgress.value, [0, 1], [0, 1]) }
      ]
    };
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      onPress={onPress}
      onPressIn={() => {
        pressProgress.value = withTiming(1, {
          duration: 95,
          easing: ReanimatedEasing.out(ReanimatedEasing.quad)
        });
      }}
      onPressOut={() => {
        pressProgress.value = withTiming(0, {
          duration: 180,
          easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
        });
      }}
      style={[styles.headerGlassButton, { shadowColor: palette.glassShadow }, style, animatedStyle]}
    >
      <GlassBlurLayer tint={palette.blurTint} intensity={48} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} />
      <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.glassFill }]} />
      <View style={[styles.glassHighlight, styles.noPointerEvents, { backgroundColor: palette.glassHighlight }]} />
      <View style={[styles.glassLowlight, styles.noPointerEvents, { backgroundColor: palette.glassLowlight }]} />
      <View style={styles.headerGlassContent}>{children}</View>
    </AnimatedPressable>
  );
}

export function YearSelectorDrawer({
  palette,
  visible,
  year,
  calendarYearMode,
  onClose,
  onConfirm
}: {
  palette: YearSelectorPalette;
  visible: boolean;
  year: number;
  calendarYearMode: boolean;
  onClose: () => void;
  onConfirm: (year: number, calendarYearMode: boolean) => void;
}) {
  if (Platform.OS === "ios" && isNativeResidencyYearSheetAvailable) {
    return <NativeResidencyYearSheet calendarYearMode={calendarYearMode} palette={palette} visible={visible} year={year} onClose={onClose} onConfirm={onConfirm} />;
  }

  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const [draftYear, setDraftYear] = useState(year);
  const [draftCalendarYearMode, setDraftCalendarYearMode] = useState(calendarYearMode);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setDraftYear(year);
      setDraftCalendarYearMode(calendarYearMode);
      setIsRendered(true);
      dragY.value = 0;
      progress.value = withSpring(1, {
        damping: 24,
        mass: 0.85,
        stiffness: 190
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 190,
        easing: ReanimatedEasing.in(ReanimatedEasing.quad)
      },
      (finished) => {
        if (finished) {
          dragY.value = 0;
          runOnJS(setIsRendered)(false);
        }
      }
    );
  }, [calendarYearMode, dragY, progress, visible, year]);

  const drawerGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-18, 18])
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > 96 || event.velocityY > 820;
          if (shouldClose) {
            runOnJS(onClose)();
            return;
          }

          dragY.value = withSpring(0, {
            damping: 22,
            mass: 0.8,
            stiffness: 220
          });
        }),
    [dragY, onClose]
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(dragY.value, [0, 240], [1, 0.22], Extrapolation.CLAMP)
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [420, 0]) + dragY.value },
      { scale: interpolate(dragY.value, [0, 240], [1, 0.985], Extrapolation.CLAMP) }
    ]
  }));

  if (!isRendered) return null;

  if (Platform.OS === "ios") {
    return (
      <NativeBottomSheet
        contentStyle={[
          styles.yearDrawerNativeContent,
          {
            backgroundColor: palette.menuGlassFill,
            paddingBottom: Math.max(insets.bottom, 14) + 10
          }
        ]}
        visible={visible}
        onClose={onClose}
      >
        <View className="flex-row items-center gap-3 px-5 pt-4">
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.pill }}>
            <CalendarDays size={20} color={palette.accent} strokeWidth={iconStrokeWidth} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold" style={{ color: palette.foreground }}>
              Residency year
            </Text>
            <Text className="text-xs" style={{ color: palette.muted }} numberOfLines={1}>
              {draftCalendarYearMode ? "Calendar year, Jan-Dec" : "India fiscal year, Apr-Mar"}
            </Text>
          </View>
        </View>

        <View className="mx-5 mt-5 flex-row items-center justify-between rounded-2xl p-2" style={{ backgroundColor: palette.pill }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous year" className="h-11 w-11 items-center justify-center rounded-full active:opacity-75" style={{ backgroundColor: palette.card }} onPress={() => setDraftYear((value) => Math.max(2000, value - 1))}>
            <ChevronLeft size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
          </Pressable>
          <View className="items-center">
            <Text className="text-lg font-extrabold" style={{ color: palette.foreground }}>
              {getFiscalYearLabel(draftYear, draftCalendarYearMode)}
            </Text>
            <Text className="text-xs" style={{ color: palette.muted }}>
              {draftCalendarYearMode ? "Calendar year" : "India FY"}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next year" className="h-11 w-11 items-center justify-center rounded-full active:opacity-75" style={{ backgroundColor: palette.card }} onPress={() => setDraftYear((value) => Math.min(2100, value + 1))}>
            <ChevronRight size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>

        <NativePicker
          color={palette.accent}
          options={["India FY", "Calendar"]}
          selectedIndex={draftCalendarYearMode ? 1 : 0}
          style={styles.nativePicker}
          variant="segmented"
          onChange={(index) => setDraftCalendarYearMode(index === 1)}
        />

        <View style={styles.drawerActionRow}>
          <DrawerActionButton backgroundColor={palette.pill} borderColor={palette.border} foregroundColor={palette.foreground} title="Cancel" style={styles.nativeActionButton} onPress={onClose} />
          <DrawerActionButton backgroundColor={palette.accent} borderColor={palette.accent} foregroundColor={palette.accentForeground} systemImage="checkmark" title="Confirm" style={styles.nativeActionButton} onPress={() => onConfirm(draftYear, draftCalendarYearMode)} />
        </View>
      </NativeBottomSheet>
    );
  }

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.noPointerEvents, backdropStyle]}>
          <GlassBlurLayer tint={palette.blurTint} intensity={14} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.drawerBackdrop }]} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.yearDrawer,
            {
              borderColor: palette.glassBorder,
              paddingBottom: Math.max(insets.bottom, 14) + 10,
              shadowColor: palette.glassShadow
            },
            drawerStyle
          ]}
        >
          <GlassBlurLayer tint={palette.blurTint} intensity={64} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} />
          <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.menuGlassFill }]} />
          <View style={[styles.glassHighlight, styles.noPointerEvents, { backgroundColor: palette.glassHighlight }]} />
          <View style={[styles.yearDrawerRim, styles.noPointerEvents, { borderColor: palette.glassRim }]} />
          <GestureDetector gesture={drawerGesture}>
            <Animated.View style={styles.drawerHandleTouchArea}>
              <View style={[styles.drawerHandle, { backgroundColor: palette.glassBorderActive }]} />
            </Animated.View>
          </GestureDetector>

          <View className="flex-row items-center gap-3 px-5 pt-4">
            <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.pill }}>
              <CalendarDays size={20} color={palette.accent} strokeWidth={iconStrokeWidth} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold" style={{ color: palette.foreground }}>
                Residency year
              </Text>
              <Text className="text-xs" style={{ color: palette.muted }} numberOfLines={1}>
                {draftCalendarYearMode ? "Calendar year, Jan-Dec" : "India fiscal year, Apr-Mar"}
              </Text>
            </View>
          </View>

          <View className="mx-5 mt-5 flex-row items-center justify-between rounded-2xl p-2" style={{ backgroundColor: palette.pill }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous year" className="h-11 w-11 items-center justify-center rounded-full active:opacity-75" style={{ backgroundColor: palette.card }} onPress={() => setDraftYear((value) => Math.max(2000, value - 1))}>
              <ChevronLeft size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </Pressable>
            <View className="items-center">
              <Text className="text-lg font-extrabold" style={{ color: palette.foreground }}>
                {getFiscalYearLabel(draftYear, draftCalendarYearMode)}
              </Text>
              <Text className="text-xs" style={{ color: palette.muted }}>
                {draftCalendarYearMode ? "Calendar year" : "India FY"}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Next year" className="h-11 w-11 items-center justify-center rounded-full active:opacity-75" style={{ backgroundColor: palette.card }} onPress={() => setDraftYear((value) => Math.min(2100, value + 1))}>
              <ChevronRight size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </Pressable>
          </View>

          <View className="mx-5 mt-4 flex-row gap-2">
            <YearModeButton selected={!draftCalendarYearMode} title="India FY" detail="Apr-Mar" palette={palette} onPress={() => setDraftCalendarYearMode(false)} />
            <YearModeButton selected={draftCalendarYearMode} title="Calendar" detail="Jan-Dec" palette={palette} onPress={() => setDraftCalendarYearMode(true)} />
          </View>

          <View style={styles.drawerActionRow}>
            <DrawerActionButton backgroundColor={palette.pill} borderColor={palette.border} foregroundColor={palette.foreground} title="Cancel" style={styles.nativeActionButton} onPress={onClose} />
            <DrawerActionButton backgroundColor={palette.accent} borderColor={palette.accent} foregroundColor={palette.accentForeground} systemImage="checkmark" title="Confirm" style={styles.nativeActionButton} onPress={() => onConfirm(draftYear, draftCalendarYearMode)} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function getFiscalYearLabel(year: number, calendarYearMode: boolean) {
  if (calendarYearMode) return String(year);
  return `FY ${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
}

function GlassBlurLayer({ tint, intensity, style }: { tint: YearSelectorPalette["blurTint"]; intensity: number; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === "web") return <BlurView tint={tint} intensity={intensity} style={style} />;
  return <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={intensity} tint={tint} style={style} />;
}

function YearModeButton({ selected, title, detail, palette, onPress }: { selected: boolean; title: string; detail: string; palette: YearSelectorPalette; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-1 rounded-2xl border px-4 py-3 active:opacity-75"
      style={{ backgroundColor: palette.pill, borderColor: selected ? palette.foreground : palette.border }}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
            {title}
          </Text>
          <Text className="text-xs" style={{ color: palette.muted }}>
            {detail}
          </Text>
        </View>
        <View style={[styles.radioOuter, { borderColor: selected ? palette.foreground : palette.border }]}>
          {selected ? <View style={[styles.radioInner, { backgroundColor: palette.foreground }]} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerGlassButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24
  },
  headerGlassContent: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    zIndex: 1
  },
  glassHighlight: {
    height: "48%",
    left: 1,
    opacity: 0.42,
    position: "absolute",
    right: 1,
    top: 1
  },
  glassLowlight: {
    bottom: 1,
    height: "34%",
    left: 1,
    opacity: 0.26,
    position: "absolute",
    right: 1
  },
  modalRoot: {
    flex: 1
  },
  noPointerEvents: {
    pointerEvents: "none"
  },
  radioOuter: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    height: 18,
    justifyContent: "center",
    marginTop: 1,
    width: 18
  },
  radioInner: {
    borderRadius: 999,
    height: 8,
    width: 8
  },
  yearDrawer: {
    borderCurve: "continuous",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    paddingTop: 8,
    position: "absolute",
    right: 0,
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.24,
    shadowRadius: 34
  },
  yearDrawerNativeContent: {
    paddingHorizontal: 0,
    paddingTop: 20
  },
  drawerActionRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 20,
    marginHorizontal: 20,
    marginTop: 24
  },
  nativeActionButton: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: 0
  },
  nativePicker: {
    marginHorizontal: 20,
    marginTop: 20,
    width: "auto"
  },
  yearDrawerRim: {
    ...StyleSheet.absoluteFillObject,
    borderCurve: "continuous",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1
  },
  drawerHandle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    opacity: 0.72,
    width: 42
  },
  drawerHandleTouchArea: {
    alignItems: "center",
    height: 26,
    justifyContent: "center"
  }
});
