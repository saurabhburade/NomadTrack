import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, Share as NativeShare, StyleSheet, Switch, useColorScheme, View, type StyleProp, type ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Info,
  MoreHorizontal,
  RefreshCw,
  Share
} from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing as ReanimatedEasing, Extrapolation, interpolate, interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/ui/text";
import { distributionColors, getNeutralPalette, iconStrokeWidth, statusColors } from "../lib/colors";
import { compactNumber, formatRelativeTime } from "../lib/utils";
import { formatResidencyYearLabel, getResidencyYearDayCount } from "../services/calculations/residencyYear";
import { captureManualLocation, startBackgroundTracking, stopBackgroundTracking } from "../services/tracking/locationTracking";
import { useAppStore } from "../store/appStore";
import type { TrackingIntervalHours } from "../types/models";
import type { RootTabParamList } from "../navigation/AppNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function DashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, "Dashboard">>();
  const { summary, isOffline, settings, refresh, runGeocodeQueue, updateSetting } = useAppStore();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [shareAfterQuickMenuClose, setShareAfterQuickMenuClose] = useState(false);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getPalette(isDark);
  const yearDayCount = getResidencyYearDayCount(settings);
  const totalTrackedDays = summary.indiaDays + summary.outsideIndiaDays;
  const remainingDays = Math.max(0, yearDayCount - totalTrackedDays);
  const countryRows = summary.countryTotals.slice(0, 6);
  const topCountries = summary.countryTotals.slice(0, 3);
  const otherDays = Math.max(0, summary.countryTotals.slice(3).reduce((sum, row) => sum + row.days, 0));
  const fiscalYearLabel = formatResidencyYearLabel(settings.residencyYearEnd, settings.calendarYearMode);
  const currentLocation = summary.currentLocation;
  const autoTrackEnabled = !settings.trackingPaused && settings.trackingInterval !== "manual";

  useEffect(() => {
    const timer = setInterval(() => {
      void runGeocodeQueue().catch(() => undefined);
    }, 60_000);
    return () => clearInterval(timer);
  }, [runGeocodeQueue]);

  async function saveResidencyYear(year: number, calendarYearMode: boolean) {
    await updateSetting("residencyYearEnd", Math.max(2000, Math.min(2100, year)));
    await updateSetting("calendarYearMode", calendarYearMode);
    await updateSetting("fiscalYearStartMonth", calendarYearMode ? 1 : 4);
    await updateSetting("fiscalYearStartDay", 1);
    await refresh();
  }

  function shareSummary() {
    void NativeShare.share({
      title: "Travel NRI Tracker",
      message: `${fiscalYearLabel}: ${summary.indiaDays} India days, ${summary.outsideIndiaDays} days abroad.`
    }).catch((error) => {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Could not open the share sheet.");
    });
  }

  function requestShareSummary() {
    setShareAfterQuickMenuClose(true);
    setIsQuickMenuOpen(false);
  }

  function handleQuickMenuClosed() {
    if (!shareAfterQuickMenuClose) return;

    setShareAfterQuickMenuClose(false);
    requestAnimationFrame(shareSummary);
  }

  async function setAutoTrackLocation(enabled: boolean) {
    if (enabled) {
      const interval: TrackingIntervalHours = settings.trackingInterval === "manual" ? 4 : settings.trackingInterval;
      if (settings.trackingInterval === "manual") {
        await updateSetting("trackingInterval", interval);
      }
      await updateSetting("trackingPaused", false);
      await startBackgroundTracking(interval);
    } else {
      await updateSetting("trackingPaused", true);
      await stopBackgroundTracking();
    }

    await refresh();
  }

  async function refreshCurrentLocation() {
    if (isRefreshingLocation) return;
    setIsRefreshingLocation(true);
    try {
      await captureManualLocation();
      await refresh();
    } catch (error) {
      Alert.alert("Location update failed", error instanceof Error ? error.message : "Could not update your current location.");
    } finally {
      setIsRefreshingLocation(false);
    }
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: palette.screen }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={palette.accent} />}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View className="gap-5 px-5 pt-5" style={{ paddingBottom: Math.max(insets.bottom, 10) + 118 }}>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-3xl font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
            Dashboard
          </Text>
          <View className="flex-row shrink-0 items-center gap-2">
            <HeaderGlassButton
              accessibilityLabel="Change residency year"
              active={isYearSelectorOpen}
              palette={palette}
              style={styles.yearHeaderButton}
              onPress={() => setIsYearSelectorOpen(true)}
            >
              <Text className="text-lg font-bold" style={{ color: palette.foreground }}>
                {fiscalYearLabel}
              </Text>
            </HeaderGlassButton>
            <HeaderGlassButton
              accessibilityLabel="Open dashboard menu"
              active={isQuickMenuOpen}
              palette={palette}
              style={styles.iconHeaderButton}
              onPress={() => setIsQuickMenuOpen(true)}
            >
              <MoreHorizontal size={27} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </HeaderGlassButton>
          </View>
        </View>

        {(summary.pendingValidationCount > 0 || isOffline) && (
          <View className="flex-row items-center gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: palette.warningBack }}>
            <AlertTriangle size={18} color={palette.warning} strokeWidth={iconStrokeWidth} />
            <Text className="flex-1 text-xs font-semibold" style={{ color: palette.warningText }}>
              {isOffline
                ? "Offline tracking active. Saved points will validate when online."
                : `${summary.pendingValidationCount} ${summary.pendingValidationCount === 1 ? "location" : "locations"} waiting for validation.`}
            </Text>
          </View>
        )}

        <View style={[styles.autoTrackCard, { backgroundColor: palette.autoTrackCard }]}>
          <View style={styles.autoTrackTopRow}>
            <View style={styles.autoTrackTitleRow}>
              <Text className="text-base font-bold" style={[styles.autoTrackTitle, { color: palette.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
                Auto Track Location
              </Text>
              <Info size={18} color={palette.accent} strokeWidth={iconStrokeWidth} />
            </View>
            <View style={styles.autoTrackControls}>
              <Switch
                value={autoTrackEnabled}
                onValueChange={(value) => void setAutoTrackLocation(value)}
                trackColor={{ false: palette.switchOff, true: palette.success }}
                thumbColor={palette.switchThumb}
                ios_backgroundColor={palette.switchOff}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh current location"
                disabled={isRefreshingLocation}
                hitSlop={8}
                style={[styles.refreshIconButton, { backgroundColor: palette.pill, borderColor: palette.border, opacity: isRefreshingLocation ? 0.55 : 1 }]}
                onPress={() => void refreshCurrentLocation()}
              >
                <RefreshCw size={18} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              </Pressable>
            </View>
          </View>
          <Text className="text-sm" style={[styles.autoTrackCopy, { color: palette.muted }]}>
            Enabling this will automatically track your location throughout the day and ensure your stay history is up to date.
          </Text>
          <View className="flex-row items-center gap-2">
            {currentLocation?.countryCode ? <Text className="text-lg">{flagForCountry(currentLocation.countryCode)}</Text> : null}
            <Text className="flex-1 text-xs font-semibold" numberOfLines={1} style={{ color: palette.section }}>
              {currentLocation?.city ? `${currentLocation.city}, ` : ""}
              {currentLocation?.countryName ?? "Pending first location"}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open year distribution overview"
          style={styles.yearDistributionPressable}
          onPress={() => navigation.navigate("YearOverview")}
        >
          <Panel palette={palette}>
            <Text className="text-lg font-bold" style={{ color: palette.foreground }}>
              Year Distribution
            </Text>
            <SegmentedBar
              total={yearDayCount}
              trackColor={palette.track}
              segments={[
                ...topCountries.map((row, index) => ({ key: row.countryCode, value: row.days, color: getDistributionColor(index, palette) })),
                { key: "others", value: otherDays, color: getDistributionColor(3, palette) },
                { key: "remaining", value: remainingDays, color: palette.remaining }
              ]}
            />
            <View className="flex-row flex-wrap gap-x-6 gap-y-5">
              {topCountries.map((row, index) => (
                <LegendItem key={row.countryCode} color={getDistributionColor(index, palette)} label={row.countryName} value={row.days} palette={palette} />
              ))}
              {otherDays > 0 ? <LegendItem color={getDistributionColor(3, palette)} label="Others" value={otherDays} palette={palette} /> : null}
              <LegendItem color={palette.remaining} label="Remaining" value={remainingDays} palette={palette} muted />
            </View>
          </Panel>
        </Pressable>

        <Text className="px-5 text-lg font-bold" style={{ color: palette.section, marginTop: 8 }}>
          Countries
        </Text>

        {countryRows.length > 0 ? (
          countryRows.map((row, index) => (
            <CountryCard key={row.countryCode} row={row} palette={palette} />
          ))
        ) : (
          <Panel palette={palette}>
            <Text className="text-base font-bold" style={{ color: palette.foreground }}>
              Countries pending
            </Text>
            <Text className="text-sm" style={{ color: palette.muted }}>
              Country totals appear after locations are validated.
            </Text>
          </Panel>
        )}

      </View>
      <DashboardQuickMenu
        palette={palette}
        visible={isQuickMenuOpen}
        onShare={requestShareSummary}
        onClose={() => setIsQuickMenuOpen(false)}
        onClosed={handleQuickMenuClosed}
      />
      <YearSelectorDrawer
        palette={palette}
        visible={isYearSelectorOpen}
        year={settings.residencyYearEnd}
        calendarYearMode={settings.calendarYearMode}
        onClose={() => setIsYearSelectorOpen(false)}
        onConfirm={(year, calendarYearMode) => {
          setIsYearSelectorOpen(false);
          void saveResidencyYear(year, calendarYearMode);
        }}
      />
    </ScrollView>
  );
}

type Palette = ReturnType<typeof getPalette>;
type CountryRow = { countryCode: string; countryName: string; days: number };
type MenuIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

function HeaderGlassButton({
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
  palette: Palette;
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
      <View style={styles.headerGlassContent}>
        {children}
      </View>
    </AnimatedPressable>
  );
}

function DashboardQuickMenu({
  palette,
  visible,
  onShare,
  onClose,
  onClosed
}: {
  palette: Palette;
  visible: boolean;
  onShare: () => void;
  onClose: () => void;
  onClosed: () => void;
}) {
  const [isRendered, setIsRendered] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      progress.value = withTiming(1, {
        duration: 210,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 150,
        easing: ReanimatedEasing.in(ReanimatedEasing.quad)
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
          runOnJS(onClosed)();
        }
      }
    );
  }, [onClosed, visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1])
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-10, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.96, 1]) }
    ]
  }));

  function handleShare() {
    onShare();
  }

  if (!isRendered) return null;

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.noPointerEvents, backdropStyle]}>
          <GlassBlurLayer tint={palette.blurTint} intensity={18} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.glassBackdrop }]} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.quickMenuCard,
            {
              borderColor: palette.glassBorder,
              shadowColor: palette.glassShadow
            },
            menuStyle
          ]}
        >
          <GlassBlurLayer tint={palette.blurTint} intensity={72} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} />
          <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.menuGlassFill }]} />
          <View style={[styles.glassHighlight, styles.noPointerEvents, { backgroundColor: palette.glassHighlight }]} />
          <View style={[styles.quickMenuRim, styles.noPointerEvents, { borderColor: palette.glassRim }]} />
          <View style={styles.quickMenuContent}>
            <MenuActionRow icon={Share} label="Share Summary" palette={palette} onPress={handleShare} />
            <MenuActionRow icon={FileText} label="Monthly Report" palette={palette} onPress={onClose} />
            <MenuActionRow icon={CalendarDays} label="Calendar Year Report" palette={palette} onPress={onClose} />
            <MenuActionRow icon={Banknote} label="Fiscal Year Report" palette={palette} onPress={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function GlassBlurLayer({ tint, intensity, style }: { tint: Palette["blurTint"]; intensity: number; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === "web") {
    return <BlurView tint={tint} intensity={intensity} style={style} />;
  }

  return <View style={[style, { backgroundColor: tint === "dark" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.08)" }]} />;
}

function MenuActionRow({ icon: Icon, label, palette, onPress }: { icon: MenuIcon; label: string; palette: Palette; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="menuitem" onPress={onPress} className="h-16 flex-row items-center gap-5">
      <Icon size={28} color={palette.foreground} strokeWidth={iconStrokeWidth} />
      <Text className="flex-1 text-lg" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

function YearSelectorDrawer({
  palette,
  visible,
  year,
  calendarYearMode,
  onClose,
  onConfirm
}: {
  palette: Palette;
  visible: boolean;
  year: number;
  calendarYearMode: boolean;
  onClose: () => void;
  onConfirm: (year: number, calendarYearMode: boolean) => void;
}) {
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

  function confirmSelection() {
    onConfirm(draftYear, draftCalendarYearMode);
  }

  if (!isRendered) return null;

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
                {formatResidencyYearLabel(draftYear, draftCalendarYearMode)}
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

          <View className="mx-5 mt-5 flex-row gap-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel residency year selection" className="h-12 flex-1 items-center justify-center rounded-2xl border active:opacity-75" style={{ borderColor: palette.border, backgroundColor: palette.pill }} onPress={onClose}>
              <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Confirm residency year selection" className="h-12 flex-1 items-center justify-center rounded-2xl active:opacity-75" style={{ backgroundColor: palette.accent }} onPress={confirmSelection}>
              <Text className="text-sm font-bold" style={{ color: palette.accentForeground }}>
                Confirm
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function YearModeButton({ selected, title, detail, palette, onPress }: { selected: boolean; title: string; detail: string; palette: Palette; onPress: () => void }) {
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

function Panel({ children, compact = false, palette }: { children: ReactNode; compact?: boolean; palette: Palette }) {
  return (
    <View className={compact ? "gap-4 rounded-[24px] px-6 py-5" : "gap-6 rounded-[28px] p-6"} style={{ backgroundColor: palette.card, shadowColor: palette.shadow, shadowOpacity: 0.08, shadowRadius: 24 }}>
      {children}
    </View>
  );
}

function CountryCard({ row, palette }: { row: CountryRow; palette: Palette }) {
  return (
    <Panel compact palette={palette}>
      <View className="flex-row items-center gap-4">
        <Text className="text-2xl">{flagForCountry(row.countryCode)}</Text>
        <Text className="flex-1 text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
          {row.countryName}
        </Text>
      </View>
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-row flex-1 items-center gap-2">
          <Banknote size={20} color={palette.section} strokeWidth={iconStrokeWidth} />
          <Text className="text-sm font-semibold" style={{ color: palette.section }}>
            Fiscal Residency
          </Text>
        </View>
        <View className="flex-row gap-1" style={{ alignItems: "baseline" }}>
          <Text className="text-xl font-bold" style={{ color: palette.success }}>
            {compactNumber(row.days)}
          </Text>
          <Text className="text-sm" style={{ color: palette.section }}>
            days
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <Clock3 size={16} color={palette.section} strokeWidth={iconStrokeWidth} />
        <Text className="text-xs font-medium" style={{ color: palette.section }}>
          Fiscal days allowed: Unknown
        </Text>
      </View>
    </Panel>
  );
}

function SegmentedBar({ segments, total, trackColor }: { segments: Array<{ key: string; value: number; color: string }>; total: number; trackColor: string }) {
  const visibleSegments = segments.filter((segment) => segment.value > 0);
  return (
    <View className="h-8 flex-row overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
      {visibleSegments.map((segment) => (
        <View key={segment.key} style={{ width: `${Math.max(1.5, (segment.value / total) * 100)}%`, backgroundColor: segment.color }} />
      ))}
    </View>
  );
}

function ProgressBar({ progress, color, trackColor }: { progress: number; color: string; trackColor: string }) {
  return (
    <View className="h-6 overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
      <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: color }} />
    </View>
  );
}

function LegendItem({ color, label, value, palette, muted = false }: { color: string; label: string; value: number; palette: Palette; muted?: boolean }) {
  const textColor = muted ? palette.section : palette.foreground;
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-sm" numberOfLines={1} style={{ color: textColor }}>
        {label} <Text className="text-sm font-bold" style={{ color: textColor }}>{compactNumber(value)}</Text>
      </Text>
    </View>
  );
}

function getDistributionColor(index: number, palette: Palette) {
  return distributionColors[index] ?? palette.accent;
}

function flagForCountry(countryCode: string) {
  if (countryCode.length !== 2) return countryCode;
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getPalette(isDark: boolean) {
  const neutral = getNeutralPalette(isDark);

  return {
    screen: isDark ? neutral.backgroundPrimary : neutral.backgroundSecondary,
    card: isDark ? neutral.backgroundSecondary : neutral.backgroundPrimary,
    pill: isDark ? neutral.backgroundTertiary : neutral.backgroundPrimary,
    foreground: neutral.foreground,
    muted: neutral.foregroundSecondary,
    section: neutral.foregroundSecondary,
    border: neutral.border,
    menu: isDark ? "#1f1f1f" : neutral.backgroundSecondary,
    menuBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    separator: neutral.border,
    overlay: isDark ? "rgba(0,0,0,0.56)" : "rgba(0,0,0,0.24)",
    autoTrackCard: isDark ? neutral.backgroundSecondary : neutral.backgroundPrimary,
    accent: neutral.primary,
    accentForeground: neutral.primaryForeground,
    selectedDetail: isDark ? "#525252" : "#d4d4d4",
    success: isDark ? "#22c55e" : statusColors.success,
    warning: isDark ? "#facc15" : statusColors.warning,
    warningText: isDark ? "#fef3c7" : "#713f12",
    warningBack: isDark ? "#332500" : "#fef3c7",
    track: isDark ? neutral.backgroundTertiary : neutral.backgroundTertiary,
    remaining: isDark ? "#525252" : "#d4d4d4",
    shadow: neutral.shadow,
    switchOff: neutral.backgroundTertiary,
    switchThumb: neutral.backgroundPrimary,
    blurTint: (isDark ? "dark" : "light") as "dark" | "light",
    glassBackdrop: isDark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.16)",
    drawerBackdrop: isDark ? "rgba(0,0,0,0.76)" : "rgba(0,0,0,0.32)",
    glassFill: isDark ? neutral.backgroundSecondary : neutral.backgroundPrimary,
    menuGlassFill: neutral.backgroundPrimary,
    glassHighlight: isDark ? "transparent" : "rgba(255,255,255,0.82)",
    glassLowlight: isDark ? "transparent" : "rgba(0,0,0,0.04)",
    glassBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
    glassBorderActive: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.18)",
    glassRim: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    glassShadow: neutral.shadow
  };
}

const styles = StyleSheet.create({
  yearDistributionPressable: {
    borderRadius: 28
  },
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
  yearHeaderButton: {
    height: 44,
    paddingHorizontal: 16,
    minWidth: 104
  },
  iconHeaderButton: {
    height: 44,
    width: 44
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
  autoTrackCard: {
    borderRadius: 26,
    gap: 10,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 16
  },
  autoTrackTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  autoTrackTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 14,
    paddingRight: 12
  },
  autoTrackControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  refreshIconButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  autoTrackTitle: {
    flexShrink: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 22
  },
  autoTrackCopy: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17
  },
  quickMenuCard: {
    borderCurve: "continuous",
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
    position: "absolute",
    right: 16,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    top: 96,
    width: 300
  },
  quickMenuContent: {
    paddingHorizontal: 24,
    paddingVertical: 20
  },
  quickMenuRim: {
    ...StyleSheet.absoluteFillObject,
    borderCurve: "continuous",
    borderRadius: 32,
    borderWidth: 1
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
