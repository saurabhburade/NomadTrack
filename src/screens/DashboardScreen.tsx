import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { AlertTriangle, Banknote, CalendarDays, ChevronLeft, ChevronRight, Clock3, FileText, MoreHorizontal, RefreshCw, Share } from "lucide-react-native";
import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  Modal,
  Share as NativeShare,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  type StyleProp,
  StyleSheet,
  useColorScheme,
  View,
  type ViewStyle
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  Easing as ReanimatedEasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiquidGlassLayer } from "../components/native/LiquidGlassLayer";
import { isNativeAutomationGuideSheetAvailable, NativeAutomationGuideSheet } from "../components/native/NativeAutomationGuideSheet";
import { NativeDashboardHeaderActions } from "../components/native/NativeDashboardHeaderActions";
import { NativeGlassButton } from "../components/native/NativeGlassButton";
import { isNativeReportPreviewSheetAvailable, NativeReportPreviewSheet } from "../components/native/NativeReportPreviewSheet";
import { isNativeResidencyYearSheetAvailable, NativeResidencyYearSheet } from "../components/native/NativeResidencyYearSheet";
import { NativeSwitch } from "../components/native/NativeSwitch";
import { BlurReplaceText } from "../components/ui/blur-replace-text";
import { DrawerActionButton } from "../components/ui/drawer-action-button";
import { Text } from "../components/ui/text";
import { distributionColors, getNeutralPalette, iconStrokeWidth, statusColors } from "../lib/colors";
import { compactNumber, formatRelativeTime } from "../lib/utils";
import { formatResidencyYearLabel, getResidencyYearDayCount } from "../services/calculations/residencyYear";
import { prepareTravelReportPreview, type ReportKind, shareTravelReportPdf, type TravelReportPreview } from "../services/export/reportPdf";
import {
  captureAutomaticLocationNow,
  captureManualLocation,
  hasBackgroundTrackingPermission,
  startBackgroundTracking,
  stopBackgroundTracking
} from "../services/tracking/locationTracking";
import { useAppStore } from "../store/appStore";
import type { TrackingIntervalHours } from "../types/models";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function DashboardScreen() {
  const router = useRouter();
  const { summary, isOffline, selectedDate, settings, refresh, runGeocodeQueue, updateSetting } = useAppStore();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [pendingQuickMenuAction, setPendingQuickMenuAction] = useState<"share" | ReportKind | null>(null);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const [isAutomationGuideOpen, setIsAutomationGuideOpen] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportPreview, setReportPreview] = useState<TravelReportPreview | null>(null);
  const [isAutoTrackStarting, setIsAutoTrackStarting] = useState(false);
  const [pendingAutoTrackEnable, setPendingAutoTrackEnable] = useState(false);
  const [hasAlwaysLocationPermission, setHasAlwaysLocationPermission] = useState(false);
  const autoTrackStartInFlight = useRef(false);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getPalette(isDark);
  const yearDayCount = getResidencyYearDayCount(settings);
  const totalTrackedDays = summary.indiaDays + summary.outsideIndiaDays;
  const remainingDays = Math.max(0, yearDayCount - totalTrackedDays);
  const countryRows = summary.countryTotals.slice(0, 6);
  const topCountries = summary.countryTotals.slice(0, 3);
  const otherDays = Math.max(
    0,
    summary.countryTotals.slice(3).reduce((sum, row) => sum + row.days, 0)
  );
  const fiscalYearLabel = formatResidencyYearLabel(settings.residencyYearEnd, settings.calendarYearMode);
  const dashboardYearButtonLabel = fiscalYearLabel;
  const currentLocation = summary.currentLocation;
  const autoTrackEnabled = isAutoTrackStarting || (hasAlwaysLocationPermission && !settings.trackingPaused && settings.trackingInterval !== "manual");
  const shortcutsAutomationStatus = useMemo(
    () => getShortcutsAutomationStatus(settings.shortcutsAutomationClaimedAt, settings.shortcutsAutomationLastVerifiedAt),
    [settings.shortcutsAutomationClaimedAt, settings.shortcutsAutomationLastVerifiedAt]
  );

  useEffect(() => {
    void runGeocodeQueue().catch(() => undefined);
    const timer = setInterval(() => {
      void runGeocodeQueue().catch(() => undefined);
    }, 60_000);
    return () => clearInterval(timer);
  }, [runGeocodeQueue]);

  const completeAutoTrackEnable = useCallback(
    async (interval: Exclude<TrackingIntervalHours, "manual">) => {
      if (autoTrackStartInFlight.current) return false;

      autoTrackStartInFlight.current = true;
      setIsAutoTrackStarting(true);
      try {
        const started = await startBackgroundTracking(interval);
        setHasAlwaysLocationPermission(started);
        if (!started) return false;

        await updateSetting("trackingPaused", false);
        setPendingAutoTrackEnable(false);

        try {
          await captureAutomaticLocationNow();
        } catch (error) {
          console.warn(`[location] Immediate auto-track capture failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        await refresh();
        return true;
      } finally {
        autoTrackStartInFlight.current = false;
        setIsAutoTrackStarting(false);
      }
    },
    [refresh, updateSetting]
  );

  const refreshLocationPermissionState = useCallback(async () => {
    try {
      const allowed = await hasBackgroundTrackingPermission();
      setHasAlwaysLocationPermission(allowed);

      if (allowed && pendingAutoTrackEnable && settings.trackingInterval !== "manual") {
        await completeAutoTrackEnable(settings.trackingInterval);
        return;
      }

      if (!allowed && !settings.trackingPaused && settings.trackingInterval !== "manual") {
        await updateSetting("trackingPaused", true);
        await stopBackgroundTracking();
      }
    } catch (error) {
      setHasAlwaysLocationPermission(false);
      console.warn(`[location] Permission check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [completeAutoTrackEnable, pendingAutoTrackEnable, settings.trackingInterval, settings.trackingPaused, updateSetting]);

  useFocusEffect(
    useCallback(() => {
      void refreshLocationPermissionState();
    }, [refreshLocationPermissionState])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshLocationPermissionState();
    });

    return () => subscription.remove();
  }, [refreshLocationPermissionState]);

  async function saveResidencyYear(year: number, calendarYearMode: boolean) {
    await updateSetting("residencyYearEnd", Math.max(2000, Math.min(2100, year)));
    await updateSetting("calendarYearMode", calendarYearMode);
    await updateSetting("fiscalYearStartMonth", calendarYearMode ? 1 : 4);
    await updateSetting("fiscalYearStartDay", 1);
    await refresh();
  }

  function shareSummary() {
    void NativeShare.share({
      title: "NomadTrack",
      message: `${fiscalYearLabel}: ${summary.indiaDays} India days, ${summary.outsideIndiaDays} days abroad.`
    }).catch((error) => {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Could not open the share sheet.");
    });
  }

  function requestShareSummary() {
    setPendingQuickMenuAction("share");
    setIsQuickMenuOpen(false);
  }

  function requestReport(kind: ReportKind) {
    setPendingQuickMenuAction(kind);
    setIsQuickMenuOpen(false);
  }

  function handleQuickMenuClosed() {
    if (!pendingQuickMenuAction) return;

    const action = pendingQuickMenuAction;
    setPendingQuickMenuAction(null);
    requestAnimationFrame(() => {
      if (action === "share") {
        shareSummary();
        return;
      }

      void openReportPreview(action);
    });
  }

  async function openReportPreview(kind: ReportKind) {
    if (isGeneratingReport) return;

    setIsGeneratingReport(true);
    try {
      const report = await prepareTravelReportPreview({ kind, selectedDate, settings });
      setReportPreview(report);
    } catch (error) {
      Alert.alert("Report failed", error instanceof Error ? error.message : "Could not create the report preview.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function shareReportPreview() {
    if (!reportPreview || isGeneratingReport) return;

    setIsGeneratingReport(true);
    try {
      const result = await shareTravelReportPdf(reportPreview, isDark);
      if (!result.didShare && result.uri) {
        Alert.alert("Report ready", `${result.title} was saved as a PDF.`);
      }
    } catch (error) {
      Alert.alert("Report failed", error instanceof Error ? error.message : "Could not create the PDF report.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function setAutoTrackLocation(enabled: boolean) {
    if (enabled) {
      const interval: TrackingIntervalHours = settings.trackingInterval === "manual" ? 4 : settings.trackingInterval;
      if (settings.trackingInterval === "manual") {
        await updateSetting("trackingInterval", interval);
      }

      setPendingAutoTrackEnable(true);
      const started = await completeAutoTrackEnable(interval);
      if (!started) {
        await updateSetting("trackingPaused", true);
        Alert.alert(
          "Always location required",
          "Allow location access always to use Auto Track Location. The app will turn this on when you return after granting permission."
        );
        return;
      }
    } else {
      setPendingAutoTrackEnable(false);
      setHasAlwaysLocationPermission(false);
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

  function showAutomationSetup() {
    if (Platform.OS !== "ios") {
      Alert.alert("iOS only", "Shortcuts automations are available on iPhone.");
      return;
    }

    setIsAutomationGuideOpen(true);
  }

  async function openShortcutsAutomationSetup() {
    try {
      await Linking.openURL("shortcuts://create-automation");
    } catch {
      try {
        await Linking.openURL("shortcuts://");
      } catch (error) {
        Alert.alert("Could not open Shortcuts", error instanceof Error ? error.message : "Open the Shortcuts app manually and create the automations.");
      }
    }
  }

  async function confirmShortcutsAutomationSetup() {
    await updateSetting("shortcutsAutomationClaimedAt", new Date().toISOString());
    setIsAutomationGuideOpen(false);
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
          {Platform.OS === "ios" ? (
            <NativeDashboardHeaderActions
              accessibilityLabel="Dashboard header actions"
              color={palette.foreground}
              fiscalYearLabel={dashboardYearButtonLabel}
              menuActions={[
                {
                  title: "Share Summary",
                  systemImage: "square.and.arrow.up",
                  onPress: () => requestAnimationFrame(shareSummary)
                },
                {
                  title: "Monthly Report",
                  systemImage: "doc.text",
                  onPress: () => requestAnimationFrame(() => void openReportPreview("monthly"))
                },
                {
                  title: "Calendar Year Report",
                  systemImage: "calendar",
                  onPress: () => requestAnimationFrame(() => void openReportPreview("calendar"))
                },
                {
                  title: "Fiscal Year Report",
                  systemImage: "banknote",
                  onPress: () => requestAnimationFrame(() => void openReportPreview("fiscal"))
                }
              ]}
              onYearPress={() => setIsYearSelectorOpen(true)}
            />
          ) : (
            <View className="flex-row shrink-0 items-center" style={styles.headerActions}>
              <HeaderGlassButton
                accessibilityLabel="Change residency year"
                active={isYearSelectorOpen}
                palette={palette}
                style={styles.yearHeaderButton}
                onPress={() => setIsYearSelectorOpen(true)}
              >
                <BlurReplaceText value={dashboardYearButtonLabel} style={[styles.dashboardYearLabel, { color: palette.foreground }]} />
              </HeaderGlassButton>
              <HeaderGlassButton
                accessibilityLabel="Open dashboard menu"
                active={isQuickMenuOpen}
                hitSlop={{ top: 12, right: 18, bottom: 12, left: 12 }}
                palette={palette}
                style={styles.iconHeaderButton}
                onPress={() => setIsQuickMenuOpen(true)}
              >
                <MoreHorizontal size={27} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              </HeaderGlassButton>
            </View>
          )}
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
            <Text className="text-base font-bold" style={[styles.autoTrackTitle, { color: palette.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
              Auto Track Location
            </Text>
            <View style={styles.autoTrackControls}>
              <NativeSwitch
                value={autoTrackEnabled}
                disabled={isAutoTrackStarting}
                style={styles.autoTrackSwitch}
                onValueChange={(value) => void setAutoTrackLocation(value)}
                offColor={palette.switchOff}
                onColor={palette.success}
                thumbColor={palette.switchThumb}
                iosBackgroundColor={palette.switchOff}
              />
              {Platform.OS === "ios" ? (
                <NativeGlassButton
                  accessibilityLabel="Refresh current location"
                  color={palette.foreground}
                  disabled={isRefreshingLocation}
                  fontSize={19}
                  fontWeight="medium"
                  shape="circle"
                  style={styles.refreshNativeGlassButton}
                  systemImage="arrow.clockwise"
                  onPress={() => void refreshCurrentLocation()}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh current location"
                  disabled={isRefreshingLocation}
                  hitSlop={8}
                  style={[styles.refreshIconButton, { backgroundColor: palette.pill, borderColor: palette.border, opacity: isRefreshingLocation ? 0.55 : 1 }]}
                  onPress={() => void refreshCurrentLocation()}
                >
                  <LiquidGlassLayer
                    colorScheme="auto"
                    glassStyle="regular"
                    intensity={58}
                    tint={palette.blurTint}
                    tintColor={palette.pill}
                    style={StyleSheet.absoluteFill}
                  />
                  <RefreshCw size={18} color={palette.foreground} strokeWidth={iconStrokeWidth} />
                </Pressable>
              )}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create Log Country Shortcuts automations"
            style={[styles.automationButton, { backgroundColor: palette.pill, borderColor: palette.border }]}
            onPress={showAutomationSetup}
          >
            <LiquidGlassLayer
              colorScheme="auto"
              glassStyle="regular"
              intensity={58}
              tint={palette.blurTint}
              tintColor={palette.pill}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.glassButtonContent}>
              <Clock3 size={18} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              <Text className="flex-1 text-sm font-bold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
                Create 1 AM + 1 PM Automations
              </Text>
            </View>
          </Pressable>
          <View style={[styles.automationStatusRow, { backgroundColor: palette.pill }]}>
            <View style={[styles.automationStatusDot, { backgroundColor: getShortcutsAutomationStatusColor(shortcutsAutomationStatus.state, palette) }]} />
            <View className="flex-1">
              <Text className="text-xs font-bold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
                {shortcutsAutomationStatus.title}
              </Text>
              <Text className="text-[11px]" numberOfLines={2} style={{ color: palette.muted }}>
                {shortcutsAutomationStatus.detail}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open year distribution overview"
          accessibilityHint="Shows the full year overview"
          hitSlop={6}
          style={({ pressed }) => [styles.yearDistributionPressable, pressed && styles.yearDistributionPressed]}
          onPress={() => router.push("/year-overview")}
        >
          <Panel palette={palette}>
            <View style={styles.yearDistributionHeader}>
              <Text className="text-lg font-bold" style={{ color: palette.foreground }}>
                Year Distribution
              </Text>
              <ChevronRight size={20} color={palette.section} strokeWidth={iconStrokeWidth} />
            </View>
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
          countryRows.map((row, index) => <CountryCard key={row.countryCode} row={row} palette={palette} />)
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
        onReport={requestReport}
        onShare={requestShareSummary}
        onClose={() => setIsQuickMenuOpen(false)}
        onClosed={handleQuickMenuClosed}
      />
      <ReportPreviewDrawer
        isSharing={isGeneratingReport}
        palette={palette}
        report={reportPreview}
        visible={Boolean(reportPreview)}
        onClose={() => setReportPreview(null)}
        onShare={() => void shareReportPreview()}
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
      <AutomationGuideDrawer
        palette={palette}
        visible={isAutomationGuideOpen}
        onClose={() => setIsAutomationGuideOpen(false)}
        onOpenShortcuts={() => {
          setIsAutomationGuideOpen(false);
          void openShortcutsAutomationSetup();
        }}
        onConfirmSetup={() => void confirmShortcutsAutomationSetup()}
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
  hitSlop = 10,
  palette,
  style,
  onPress
}: {
  accessibilityLabel: string;
  active?: boolean;
  children: ReactNode;
  hitSlop?: number | { top?: number; right?: number; bottom?: number; left?: number };
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
      transform: [{ scale: interpolate(pressProgress.value, [0, 1], [1, 0.95]) }, { translateY: interpolate(pressProgress.value, [0, 1], [0, 1]) }]
    };
  });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
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

function DashboardQuickMenu({
  palette,
  visible,
  onReport,
  onShare,
  onClose,
  onClosed
}: {
  palette: Palette;
  visible: boolean;
  onReport: (kind: ReportKind) => void;
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
    transform: [{ translateY: interpolate(progress.value, [0, 1], [-10, 0]) }, { scale: interpolate(progress.value, [0, 1], [0.96, 1]) }]
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
            <MenuActionRow icon={FileText} label="Monthly Report" palette={palette} onPress={() => onReport("monthly")} />
            <MenuActionRow icon={CalendarDays} label="Calendar Year Report" palette={palette} onPress={() => onReport("calendar")} />
            <MenuActionRow icon={Banknote} label="Fiscal Year Report" palette={palette} onPress={() => onReport("fiscal")} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function GlassBlurLayer({ tint, intensity, style }: { tint: Palette["blurTint"]; intensity: number; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === "web") return <BlurView tint={tint} intensity={intensity} style={style} />;
  return <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={intensity} tint={tint} style={style} />;
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

function ReportPreviewDrawer({
  isSharing,
  palette,
  report,
  visible,
  onClose,
  onShare
}: {
  isSharing: boolean;
  palette: Palette;
  report: TravelReportPreview | null;
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
}) {
  if (Platform.OS === "ios" && isNativeReportPreviewSheetAvailable) {
    return <NativeReportPreviewSheet isSharing={isSharing} palette={palette} report={report} visible={visible} onClose={onClose} onShare={onShare} />;
  }

  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const [renderedReport, setRenderedReport] = useState<TravelReportPreview | null>(report);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);
  const displayReport = report ?? renderedReport;

  useEffect(() => {
    if (visible && report) {
      setRenderedReport(report);
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
          runOnJS(setRenderedReport)(null);
        }
      }
    );
  }, [dragY, progress, report, visible]);

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
      { translateY: interpolate(progress.value, [0, 1], [520, 0]) + dragY.value },
      { scale: interpolate(dragY.value, [0, 240], [1, 0.985], Extrapolation.CLAMP) }
    ]
  }));

  if (!isRendered || !displayReport) return null;

  const maxCountryDays = displayReport.stats.countryTotals.reduce((max, row) => Math.max(max, row.days), 1);
  const countryRows = displayReport.stats.countryTotals.slice(0, 5);
  const detailRows = displayReport.detailRows.slice(0, displayReport.period.kind === "monthly" ? 31 : 10);

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
            styles.reportDrawer,
            {
              backgroundColor: palette.menuGlassFill,
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
          <ScrollView showsVerticalScrollIndicator={false} style={styles.reportPreviewScroll} contentContainerStyle={styles.reportPreviewContent}>
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.pill }}>
                <FileText size={20} color={palette.accent} strokeWidth={iconStrokeWidth} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold" style={{ color: palette.foreground }}>
                  {displayReport.period.title}
                </Text>
                <Text className="text-xs" style={{ color: palette.muted }}>
                  {displayReport.period.label} - {displayReport.rangeLabel}
                </Text>
              </View>
            </View>

            <View style={styles.reportMetricGrid}>
              <ReportMetric label="India" palette={palette} value={displayReport.stats.indiaDays} />
              <ReportMetric label="Abroad" palette={palette} value={displayReport.stats.outsideIndiaDays} />
              <ReportMetric label="Tracked" palette={palette} value={displayReport.stats.trackedDays} />
              <ReportMetric label="Missing" palette={palette} value={displayReport.stats.untrackedDays} />
            </View>

            <View style={[styles.reportPanel, { backgroundColor: palette.pill }]}>
              <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
                Travel calendar
              </Text>
              <ReportCalendarDots palette={palette} report={displayReport} />
            </View>

            <View style={[styles.reportPanel, { backgroundColor: palette.pill }]}>
              <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
                Country breakdown
              </Text>
              {countryRows.length > 0 ? (
                <View className="mt-3 gap-3">
                  {countryRows.map((row, index) => (
                    <View key={row.countryCode} className="gap-2">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="flex-1 text-xs font-bold" numberOfLines={1} style={{ color: palette.foreground }}>
                          {row.countryName}
                        </Text>
                        <Text className="text-xs font-bold" style={{ color: palette.muted }}>
                          {compactNumber(row.days)}
                        </Text>
                      </View>
                      <ProgressBar
                        color={getDistributionColor(index, palette)}
                        progress={Math.max(4, Math.round((row.days / maxCountryDays) * 100))}
                        trackColor={palette.track}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-3 text-xs" style={{ color: palette.muted }}>
                  No tracked country days in this period.
                </Text>
              )}
            </View>

            <View style={[styles.reportPanel, { backgroundColor: palette.pill }]}>
              <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
                {displayReport.period.kind === "monthly" ? "Week breakdown" : "Monthly breakdown"}
              </Text>
              <View className="mt-3 gap-2">
                {displayReport.stats.monthRows.map((row) => (
                  <View key={row.label} className="flex-row items-center justify-between gap-2">
                    <Text className="w-16 text-xs font-bold" style={{ color: palette.foreground }}>
                      {row.label}
                    </Text>
                    <Text className="flex-1 text-xs" numberOfLines={1} style={{ color: palette.muted }}>
                      India {row.india} / Abroad {row.abroad}
                    </Text>
                    <Text className="text-xs font-bold" style={{ color: palette.foreground }}>
                      {row.tracked}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.reportPanel, { backgroundColor: palette.pill }]}>
              <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
                {displayReport.detailTitle}
              </Text>
              <View className="mt-3 gap-2">
                {detailRows.map((row) => (
                  <View key={`${row.date}-${row.countryCode}`} className="flex-row items-center gap-2">
                    <Text className="w-24 text-xs font-bold" style={{ color: palette.foreground }}>
                      {row.date}
                    </Text>
                    <Text className="flex-1 text-xs" numberOfLines={1} style={{ color: palette.muted }}>
                      {row.countryName}
                    </Text>
                    <Text className="text-xs font-bold" style={{ color: palette.foreground }}>
                      {row.status}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.drawerActions}>
            <DrawerActionButton
              backgroundColor={palette.pill}
              borderColor={palette.glassBorder}
              foregroundColor={palette.foreground}
              title="Close"
              style={styles.nativeActionButton}
              onPress={onClose}
            />
            <DrawerActionButton
              disabled={isSharing}
              backgroundColor={palette.accent}
              borderColor={palette.accent}
              foregroundColor={palette.accentForeground}
              systemImage="square.and.arrow.up"
              title={isSharing ? "Creating PDF" : "Share PDF"}
              style={styles.nativeActionButton}
              onPress={onShare}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ReportMetric({ label, palette, value }: { label: string; palette: Palette; value: number }) {
  return (
    <View className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: palette.pill }}>
      <Text className="text-[11px] font-bold" numberOfLines={1} style={{ color: palette.muted }}>
        {label}
      </Text>
      <Text className="mt-1 text-lg font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
        {compactNumber(value)}
      </Text>
    </View>
  );
}

function chunkArray<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function ReportCalendarDots({ palette, report }: { palette: Palette; report: TravelReportPreview }) {
  const countryColorByCode = useMemo(() => {
    const colors = new Map<string, string>();
    report.stats.countryTotals.forEach((row, index) => {
      colors.set(row.countryCode, getDistributionColor(index, palette));
    });
    return colors;
  }, [palette, report.stats.countryTotals]);
  const monthsPerRow = report.calendarMonths.length > 1 ? 4 : 1;
  const monthRows = useMemo(() => chunkArray(report.calendarMonths, monthsPerRow), [monthsPerRow, report.calendarMonths]);

  const dotSize = report.calendarMonths.length > 1 ? 5 : 8;
  const dotGap = report.calendarMonths.length > 1 ? 3 : 5;
  const gridWidth = dotSize * 7 + dotGap * 6;

  return (
    <View style={styles.reportCalendarGrid}>
      {monthRows.map((row) => (
        <View key={row.map((month) => month.key).join(":")} style={styles.reportCalendarRow}>
          {row.map((month) => (
            <View key={month.key} style={styles.reportMonthTile}>
              <Text className="text-xs font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.muted }}>
                {month.label}
              </Text>
              <View style={[styles.reportDotGrid, { gap: dotGap, width: gridWidth }]}>
                {month.slots.map((slot) => {
                  if (!slot.date) {
                    return <View key={slot.key} style={{ height: dotSize, width: dotSize }} />;
                  }

                  const backgroundColor = slot.countryCode ? (countryColorByCode.get(slot.countryCode) ?? getDistributionColor(5, palette)) : palette.remaining;
                  return <View key={slot.key} style={[styles.reportDot, { backgroundColor, height: dotSize, width: dotSize }]} />;
                })}
              </View>
            </View>
          ))}
          {Array.from({ length: monthsPerRow - row.length }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.reportMonthTile} />
          ))}
        </View>
      ))}
    </View>
  );
}

function AutomationGuideDrawer({
  palette,
  visible,
  onClose,
  onOpenShortcuts,
  onConfirmSetup
}: {
  palette: Palette;
  visible: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
  onConfirmSetup: () => void;
}) {
  if (Platform.OS === "ios" && isNativeAutomationGuideSheetAvailable) {
    return (
      <NativeAutomationGuideSheet palette={palette} visible={visible} onClose={onClose} onOpenShortcuts={onOpenShortcuts} onConfirmSetup={onConfirmSetup} />
    );
  }

  const insets = useSafeAreaInsets();
  const automationTimes = ["1:00 AM", "1:00 PM"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <GlassBlurLayer tint={palette.blurTint} intensity={14} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.drawerBackdrop }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.automationDrawer,
            {
              borderColor: palette.glassBorder,
              paddingBottom: Math.max(insets.bottom, 14) + 10,
              shadowColor: palette.glassShadow
            }
          ]}
        >
          <LiquidGlassLayer
            colorScheme="auto"
            glassStyle="regular"
            intensity={76}
            tint={palette.blurTint}
            style={[StyleSheet.absoluteFill, styles.noPointerEvents]}
          />
          <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.menuGlassFill }]} />
          <View style={[styles.glassHighlight, styles.noPointerEvents, { backgroundColor: palette.glassHighlight }]} />
          <View style={[styles.yearDrawerRim, styles.noPointerEvents, { borderColor: palette.glassRim }]} />
          <View style={[styles.drawerHandle, { backgroundColor: palette.glassBorderActive }]} />
          <View className="flex-row items-center gap-3 px-5 pt-5">
            <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.pill }}>
              <Clock3 size={20} color={palette.accent} strokeWidth={iconStrokeWidth} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold" style={{ color: palette.foreground }}>
                Log Country automations
              </Text>
              <Text className="text-xs" style={{ color: palette.muted }} numberOfLines={1}>
                Create both daily schedules in Shortcuts
              </Text>
            </View>
          </View>

          <View className="mx-5 mt-5 gap-3">
            {automationTimes.map((time, index) => (
              <AutomationStepCard key={time} index={index + 1} time={time} palette={palette} />
            ))}
          </View>

          <View className="mx-5 mt-5 gap-2 rounded-2xl px-4 py-3" style={{ backgroundColor: palette.pill }}>
            <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
              For each automation
            </Text>
            <StepLine value="Choose Time of Day, set Daily, then tap Next." palette={palette} />
            <StepLine value="Add action: NomadTrack -> Log Country." palette={palette} />
            <StepLine value="Set Run Immediately, then tap Done." palette={palette} />
          </View>

          <DrawerActionButton
            backgroundColor={palette.accent}
            borderColor={palette.accent}
            foregroundColor={palette.accentForeground}
            systemImage="checkmark"
            title="I created both automations"
            style={styles.nativeFullButton}
            onPress={onConfirmSetup}
          />

          <View style={styles.drawerActions}>
            <DrawerActionButton
              backgroundColor={palette.pill}
              borderColor={palette.glassBorder}
              foregroundColor={palette.foreground}
              title="Close"
              style={styles.nativeActionButton}
              onPress={onClose}
            />
            <DrawerActionButton
              backgroundColor={palette.accent}
              borderColor={palette.accent}
              foregroundColor={palette.accentForeground}
              systemImage="arrow.up.forward.app"
              title="Open Shortcuts"
              style={styles.nativeActionButton}
              onPress={onOpenShortcuts}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AutomationStepCard({ index, time, palette }: { index: number; time: string; palette: Palette }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: palette.pill }}>
      <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: palette.card }}>
        <Text className="text-sm font-extrabold" style={{ color: palette.foreground }}>
          {index}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
          Time of Day
        </Text>
        <Text className="text-xs" style={{ color: palette.muted }}>
          Daily at {time}
        </Text>
      </View>
      <Text className="text-xs font-bold" style={{ color: palette.accent }}>
        Log Country
      </Text>
    </View>
  );
}

function StepLine({ value, palette }: { value: string; palette: Palette }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-xs font-bold" style={{ color: palette.accent }}>
        -
      </Text>
      <Text className="flex-1 text-xs" style={{ color: palette.muted }}>
        {value}
      </Text>
    </View>
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
  if (Platform.OS === "ios" && isNativeResidencyYearSheetAvailable) {
    return (
      <NativeResidencyYearSheet calendarYearMode={calendarYearMode} palette={palette} visible={visible} year={year} onClose={onClose} onConfirm={onConfirm} />
    );
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous year"
              className="h-11 w-11 items-center justify-center rounded-full active:opacity-75"
              style={{ backgroundColor: palette.card }}
              onPress={() => setDraftYear((value) => Math.max(2000, value - 1))}
            >
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next year"
              className="h-11 w-11 items-center justify-center rounded-full active:opacity-75"
              style={{ backgroundColor: palette.card }}
              onPress={() => setDraftYear((value) => Math.min(2100, value + 1))}
            >
              <ChevronRight size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </Pressable>
          </View>

          <View className="mx-5 mt-4 flex-row gap-2">
            <YearModeButton
              selected={!draftCalendarYearMode}
              title="India FY"
              detail="Apr-Mar"
              palette={palette}
              onPress={() => setDraftCalendarYearMode(false)}
            />
            <YearModeButton
              selected={draftCalendarYearMode}
              title="Calendar"
              detail="Jan-Dec"
              palette={palette}
              onPress={() => setDraftCalendarYearMode(true)}
            />
          </View>

          <View style={[styles.drawerActions, styles.drawerActionsLarge]}>
            <DrawerActionButton
              backgroundColor={palette.pill}
              borderColor={palette.glassBorder}
              foregroundColor={palette.foreground}
              title="Cancel"
              style={styles.nativeActionButton}
              onPress={onClose}
            />
            <DrawerActionButton
              backgroundColor={palette.accent}
              borderColor={palette.accent}
              foregroundColor={palette.accentForeground}
              systemImage="checkmark"
              title="Confirm"
              style={styles.nativeActionButton}
              onPress={confirmSelection}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function YearModeButton({
  selected,
  title,
  detail,
  palette,
  onPress
}: {
  selected: boolean;
  title: string;
  detail: string;
  palette: Palette;
  onPress: () => void;
}) {
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
    <View
      className={compact ? "gap-4 rounded-[24px] px-6 py-5" : "gap-6 rounded-[28px] p-6"}
      style={{ backgroundColor: palette.card, shadowColor: palette.shadow, shadowOpacity: 0.08, shadowRadius: 24 }}
    >
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
        {label}{" "}
        <Text className="text-sm font-bold" style={{ color: textColor }}>
          {compactNumber(value)}
        </Text>
      </Text>
    </View>
  );
}

function getDistributionColor(index: number, palette: Palette) {
  return distributionColors[index] ?? palette.accent;
}

type ShortcutsAutomationState = "unknown" | "claimed" | "verified" | "missing";
type ShortcutsAutomationStatus = {
  state: ShortcutsAutomationState;
  title: string;
  detail: string;
};

const SHORTCUTS_AUTOMATION_HOURS = [1, 13] as const;
const SHORTCUTS_AUTOMATION_GRACE_MS = 45 * 60 * 1000;

function getShortcutsAutomationStatus(claimedAtIso?: string, verifiedAtIso?: string): ShortcutsAutomationStatus {
  const claimedAt = parseOptionalDate(claimedAtIso);
  const verifiedAt = parseOptionalDate(verifiedAtIso);

  if (!claimedAt) {
    return {
      state: "unknown",
      title: "Shortcuts backup not confirmed",
      detail: "Create the 1 AM and 1 PM Log Country automations."
    };
  }

  const now = new Date();
  const latestExpectedRun = getLatestExpectedShortcutRun(claimedAt, now);
  const nextExpectedRun = getNextExpectedShortcutRun(now);
  const hasVerifiedAfterClaim = Boolean(verifiedAt && verifiedAt.getTime() >= claimedAt.getTime());

  if (hasVerifiedAfterClaim && (!latestExpectedRun || verifiedAt!.getTime() >= latestExpectedRun.getTime())) {
    return {
      state: "verified",
      title: "Shortcuts verified",
      detail: `Last Log Country run ${formatRelativeTime(verifiedAtIso)}. Next check ${formatShortcutRunTime(nextExpectedRun)}.`
    };
  }

  if (latestExpectedRun) {
    return {
      state: "missing",
      title: "Shortcut run missing",
      detail: `No Log Country run after ${formatShortcutRunTime(latestExpectedRun)}. Check both automations in Shortcuts.`
    };
  }

  return {
    state: "claimed",
    title: "Setup claimed",
    detail: `Waiting for the first scheduled Log Country run. Next check ${formatShortcutRunTime(nextExpectedRun)}.`
  };
}

function parseOptionalDate(iso?: string) {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getLatestExpectedShortcutRun(claimedAt: Date, now: Date) {
  const dueThreshold = new Date(now.getTime() - SHORTCUTS_AUTOMATION_GRACE_MS);

  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const day = new Date(dueThreshold);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - dayOffset);

    for (const hour of [...SHORTCUTS_AUTOMATION_HOURS].reverse()) {
      const candidate = new Date(day);
      candidate.setHours(hour, 0, 0, 0);
      if (candidate.getTime() <= dueThreshold.getTime() && candidate.getTime() > claimedAt.getTime()) {
        return candidate;
      }
    }
  }

  return undefined;
}

function getNextExpectedShortcutRun(now: Date) {
  for (const hour of SHORTCUTS_AUTOMATION_HOURS) {
    const candidate = new Date(now);
    candidate.setHours(hour, 0, 0, 0);
    if (candidate.getTime() > now.getTime()) return candidate;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(SHORTCUTS_AUTOMATION_HOURS[0], 0, 0, 0);
  return tomorrow;
}

function formatShortcutRunTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getShortcutsAutomationStatusColor(state: ShortcutsAutomationState, palette: Palette) {
  if (state === "verified") return palette.success;
  if (state === "missing") return palette.warning;
  if (state === "claimed") return palette.accent;
  return palette.muted;
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
  yearDistributionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }]
  },
  yearDistributionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headerActions: {
    columnGap: 12
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
    minWidth: 132
  },
  dashboardYearLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    fontWeight: "700"
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
    gap: 12,
    justifyContent: "space-between",
    minHeight: 52
  },
  autoTrackControls: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8
  },
  autoTrackSwitch: {
    alignSelf: "center",
    transform: [{ translateY: 2 }]
  },
  refreshIconButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
    width: 38
  },
  refreshNativeGlassButton: {
    height: 44,
    width: 44
  },
  automationButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: 42,
    justifyContent: "center",
    marginTop: 2,
    overflow: "hidden",
    paddingHorizontal: 14
  },
  glassButtonContent: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
    zIndex: 1
  },
  automationStatusRow: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  automationStatusDot: {
    borderRadius: 999,
    height: 9,
    width: 9
  },
  autoTrackTitle: {
    flex: 1,
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
  automationDrawer: {
    borderCurve: "continuous",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    paddingTop: 12,
    position: "absolute",
    right: 0,
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.24,
    shadowRadius: 34
  },
  reportDrawer: {
    borderCurve: "continuous",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    maxHeight: "88%",
    overflow: "hidden",
    paddingTop: 12,
    position: "absolute",
    right: 0,
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.24,
    shadowRadius: 34
  },
  reportPreviewContent: {
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12
  },
  reportPreviewScroll: {
    flexShrink: 1
  },
  drawerActions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 20,
    marginHorizontal: 20,
    marginTop: 16
  },
  drawerActionsLarge: {
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
  nativeFullButton: {
    alignSelf: "stretch",
    marginHorizontal: 20,
    marginTop: 20
  },
  reportMetricGrid: {
    flexDirection: "row",
    gap: 8
  },
  reportPanel: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  reportCalendarGrid: {
    gap: 14,
    marginTop: 14
  },
  reportCalendarRow: {
    flexDirection: "row",
    gap: 8
  },
  reportMonthTile: {
    alignItems: "center",
    flex: 1,
    gap: 8
  },
  reportDotGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  reportDot: {
    borderRadius: 999
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
