import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, useColorScheme, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing as ReanimatedEasing, Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudUpload,
  Download,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
  Timer,
  Upload,
  X,
  XCircle
} from "lucide-react-native";
import { Text } from "../components/ui/text";
import { getNeutralPalette, iconStrokeWidth, statusColors } from "../lib/colors";
import {
  clearGoogleAccessToken,
  getGoogleDriveAuthSetup,
  getGoogleDriveConnectionState,
  GoogleLoginRequiredError,
  storeGoogleTokenResponse,
  useGoogleDriveAuthRequest
} from "../services/auth/googleAuth";
import { listDriveBackups, restoreLatestDriveBackup, uploadBackupToDrive, writeLocalBackupFile } from "../services/backup/driveBackup";
import { exportLocationCsv } from "../services/export/csvExport";
import { startBackgroundTracking, stopBackgroundTracking } from "../services/tracking/locationTracking";
import { useAppStore } from "../store/appStore";
import type { TrackingIntervalHours } from "../types/models";

const appearanceOptions = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon }
] as const;
const fiscalYearOptions = [
  { value: "india", label: "India FY", detail: "Apr-Mar" },
  { value: "calendar", label: "Calendar", detail: "Jan-Dec" }
] as const;

type BackupStatus = {
  tone: "info" | "success" | "error";
  message: string;
};
type GoogleConnectionState = Awaited<ReturnType<typeof getGoogleDriveConnectionState>>;
type SettingsPalette = ReturnType<typeof getSettingsPalette>;
type SettingsIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type SettingsDrawer = "residency" | "appearance" | null;
type ChoiceOption = {
  value: string;
  label: string;
  detail?: string;
  Icon?: SettingsIcon;
};

const defaultGoogleConnection: GoogleConnectionState = {
  isConnected: false,
  needsLogin: true,
  hasRefreshToken: false,
  expiresAt: undefined
};
const googleLoginRequiredMessage = "Please log in with Google. Backup won't work unless Google Drive is connected.";

export function SettingsScreen() {
  const { settings, updateSetting, refresh, setSelectedDate } = useAppStore();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [googleAuthRequest, response, promptAsync] = useGoogleDriveAuthRequest();
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionState>(defaultGoogleConnection);
  const [activeDrawer, setActiveDrawer] = useState<SettingsDrawer>(null);
  const [draftResidencyYear, setDraftResidencyYear] = useState(settings.residencyYearEnd);
  const [draftCalendarYearMode, setDraftCalendarYearMode] = useState(settings.calendarYearMode);
  const googleAuthSetup = getGoogleDriveAuthSetup();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getSettingsPalette(isDark);
  const googleDriveUnavailable = !googleAuthSetup.canUseGoogleAuth || !googleAuthRequest;
  const trackingDetail = settings.trackingPaused ? "Paused" : "Active";
  const googleDriveDetail = getGoogleDriveDetail({
    isExpoGo: googleAuthSetup.isExpoGo,
    unavailable: googleDriveUnavailable,
    connected: googleConnection.isConnected
  });

  useEffect(() => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      void storeGoogleTokenResponse(response.authentication)
        .then(() => refreshGoogleConnectionState())
        .then(() => setBackupStatus({ tone: "success", message: "Google Drive connected." }))
        .catch((error) => {
          setBackupStatus({ tone: "error", message: error instanceof Error ? error.message : "Google login failed." });
        });
    }
  }, [response]);

  useEffect(() => {
    void refreshGoogleConnectionState();
  }, []);

  async function setTrackingPaused(paused: boolean) {
    if (paused) {
      await updateSetting("trackingPaused", true);
      await stopBackgroundTracking();
      return;
    }

    const interval: TrackingIntervalHours = settings.trackingInterval === "manual" ? 4 : settings.trackingInterval;
    if (settings.trackingInterval === "manual") {
      await updateSetting("trackingInterval", interval);
    }

    const started = await startBackgroundTracking(interval);
    await updateSetting("trackingPaused", !started);
    if (!started) {
      Alert.alert("Always location required", "Allow location access always to use Auto Track Location.");
    }
  }

  function openResidencyDrawer() {
    setDraftResidencyYear(settings.residencyYearEnd);
    setDraftCalendarYearMode(settings.calendarYearMode);
    setActiveDrawer("residency");
  }

  async function applyResidencySettings(year: number, calendarYearMode: boolean) {
    if (calendarYearMode) {
      await updateSetting("calendarYearMode", true);
      await updateSetting("fiscalYearStartMonth", 1);
      await updateSetting("fiscalYearStartDay", 1);
    } else {
      await updateSetting("calendarYearMode", false);
      await updateSetting("fiscalYearStartMonth", 4);
      await updateSetting("fiscalYearStartDay", 1);
    }
    await updateSetting("residencyYearEnd", Math.max(2000, Math.min(2100, year)));
    await refresh();
    setActiveDrawer(null);
  }

  function connectGoogleDrive() {
    if (googleDriveUnavailable) return;

    void promptAsync().catch((error) => {
      Alert.alert("Google login failed", error instanceof Error ? error.message : "Could not start Google login.");
    });
  }

  async function refreshGoogleConnectionState() {
    const nextConnection = await getGoogleDriveConnectionState();
    setGoogleConnection(nextConnection);
    return nextConnection;
  }

  async function ensureGoogleDriveLogin() {
    const nextConnection = await refreshGoogleConnectionState();
    if (nextConnection.isConnected) return true;
    showGoogleLoginRequiredAlert();
    return false;
  }

  function showGoogleLoginRequiredAlert(message = googleLoginRequiredMessage) {
    Alert.alert("Google login required", message);
    setBackupStatus({ tone: "error", message });
  }

  function handleBackupError(error: unknown, fallbackMessage: string) {
    if (error instanceof GoogleLoginRequiredError) {
      showGoogleLoginRequiredAlert(error.message);
      void refreshGoogleConnectionState();
      return;
    }

    setBackupStatus({ tone: "error", message: error instanceof Error ? error.message : fallbackMessage });
  }

  async function disconnectGoogleDrive() {
    await clearGoogleAccessToken();
    await refreshGoogleConnectionState();
    setBackupStatus({ tone: "info", message: "Google Drive disconnected." });
  }

  async function backupNow() {
    setIsBackupBusy(true);
    try {
      const canUseBackup = await ensureGoogleDriveLogin();
      if (!canUseBackup) return;

      setBackupStatus({ tone: "info", message: "Uploading backup to Google Drive..." });
      const result = await uploadBackupToDrive();
      setBackupStatus({ tone: "success", message: `Backup successful: ${result.name} updated ${formatBackupTime(result.modifiedTime)}.` });
      await refreshGoogleConnectionState();
      await refresh();
    } catch (error) {
      handleBackupError(error, "Backup failed.");
    } finally {
      setIsBackupBusy(false);
    }
  }

  async function checkDriveBackups() {
    setIsBackupBusy(true);
    try {
      const canUseBackup = await ensureGoogleDriveLogin();
      if (!canUseBackup) return;

      setBackupStatus({ tone: "info", message: "Checking Google Drive backup status..." });
      const result = await listDriveBackups();
      const latest = result.files.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime))[0];
      setBackupStatus({
        tone: "success",
        message: latest ? `Found ${result.files.length} backup: latest ${formatBackupTime(latest.modifiedTime)}.` : "No Drive backup found yet."
      });
      await refreshGoogleConnectionState();
    } catch (error) {
      handleBackupError(error, "Could not check Drive backups.");
    } finally {
      setIsBackupBusy(false);
    }
  }

  function confirmRestoreLatestBackup() {
    Alert.alert(
      "Restore latest backup?",
      "This will replace data for the backup's year with the latest Google Drive backup. Other years will be left unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", style: "destructive", onPress: () => void restoreLatestBackup() }
      ]
    );
  }

  async function restoreLatestBackup() {
    setIsBackupBusy(true);
    try {
      const canUseBackup = await ensureGoogleDriveLogin();
      if (!canUseBackup) return;

      setBackupStatus({ tone: "info", message: "Restoring latest Google Drive backup..." });
      const result = await restoreLatestDriveBackup();
      const restoredCount = Object.values(result.restoredRows).reduce((sum, count) => sum + count, 0);
      const travelRows =
        result.restoredRows.location_points +
        result.restoredRows.day_records +
        result.restoredRows.day_country_segments +
        result.restoredRows.trips +
        result.restoredRows.pending_geocode_jobs;
      setBackupStatus({
        tone: travelRows > 0 ? "success" : "error",
        message:
          travelRows > 0
            ? `Restore complete: ${restoredCount} rows from ${result.file.year ?? result.backup.scope.label} backup updated ${formatBackupTime(result.file.modifiedTime)}.`
            : `Restore finished, but this backup only contained settings. No travel history was found in the ${result.file.year ?? result.backup.scope.label} backup.`
      });
      await refreshGoogleConnectionState();
      await setSelectedDate(result.displayDate);
      await refresh();
    } catch (error) {
      handleBackupError(error, "Restore failed.");
    } finally {
      setIsBackupBusy(false);
    }
  }

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 10) + 126 }]}
        contentInsetAdjustmentBehavior="automatic"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: palette.screen }}
      >
        <Text className="text-3xl font-extrabold leading-[38px]" style={[styles.title, { color: palette.foreground }]}>
          Settings
        </Text>

        <SettingsSection palette={palette} title="Tracking">
          <SettingsGroup palette={palette}>
            <SettingsRow
              Icon={Timer}
              accessory={
                <Switch
                  ios_backgroundColor={palette.switchOff}
                  thumbColor={settings.trackingPaused ? palette.switchOnThumb : palette.switchThumb}
                  trackColor={{ false: palette.switchOff, true: palette.switchOn }}
                  value={settings.trackingPaused}
                  onValueChange={(value) => void setTrackingPaused(value)}
                />
              }
              detail={trackingDetail}
              palette={palette}
              title="Pause Tracking"
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection palette={palette} title="Backup">
          <SettingsGroup palette={palette}>
            <SettingsRow
              Icon={Shield}
              accessory={
                <Switch
                  ios_backgroundColor={palette.switchOff}
                  thumbColor={settings.cloudBackupEnabled ? palette.switchOnThumb : palette.switchThumb}
                  trackColor={{ false: palette.switchOff, true: palette.switchOn }}
                  value={settings.cloudBackupEnabled}
                  onValueChange={(value) => void updateSetting("cloudBackupEnabled", value)}
                />
              }
              detail={settings.cloudBackupEnabled ? "Enabled" : "Disabled"}
              palette={palette}
              title="Cloud Backup"
            />
            <SettingsDivider palette={palette} />
            <SettingsRow
              Icon={Clock3}
              accessory={
                <Switch
                  ios_backgroundColor={palette.switchOff}
                  thumbColor={settings.autoBackup ? palette.switchOnThumb : palette.switchThumb}
                  trackColor={{ false: palette.switchOff, true: palette.switchOn }}
                  value={settings.autoBackup}
                  onValueChange={(value) => void updateSetting("autoBackup", value)}
                />
              }
              detail={settings.autoBackup ? "Enabled" : "Disabled"}
              disabled={!settings.cloudBackupEnabled}
              palette={palette}
              title="Auto Backup"
            />
            <SettingsDivider palette={palette} />
            <SettingsRow
              Icon={CloudUpload}
              detail={googleDriveDetail}
              disabled={googleDriveUnavailable}
              palette={palette}
              title="Google Drive"
              onPress={connectGoogleDrive}
            />
            {backupStatus ? (
              <>
                <SettingsDivider palette={palette} />
                <BackupStatusMessage palette={palette} status={backupStatus} />
              </>
            ) : null}
            <SettingsDivider palette={palette} />
            <SettingsRow
              Icon={Upload}
              detail={googleDriveUnavailable ? "Needs Google Drive" : "Upload latest data"}
              disabled={isBackupBusy || googleDriveUnavailable}
              palette={palette}
              title={isBackupBusy ? "Working..." : "Backup Now"}
              onPress={() => void backupNow()}
            />
            <SettingsDivider palette={palette} />
            <SettingsRow
              Icon={Download}
              detail={googleDriveUnavailable ? "Needs Google Drive" : "Download latest backup"}
              disabled={isBackupBusy || googleDriveUnavailable}
              palette={palette}
              title={isBackupBusy ? "Working..." : "Restore Backup"}
              onPress={confirmRestoreLatestBackup}
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection palette={palette} title="Export & Privacy">
          <SettingsGroup palette={palette}>
            <SettingsRow Icon={Download} detail="Location history CSV" palette={palette} title="Export CSV" onPress={() => void exportLocationCsv()} />
            <SettingsDivider palette={palette} />
            <SettingsRow Icon={Download} detail="Local JSON file" palette={palette} title="Save Local Backup" onPress={() => void writeLocalBackupFile()} />
            <SettingsDivider palette={palette} />
            <SettingsRow Icon={LogOut} destructive detail={googleConnection.isConnected ? "Remove saved token" : "No account connected"} palette={palette} title="Disconnect Google" onPress={() => void disconnectGoogleDrive()} />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection palette={palette} title="Fiscal Year">
          <SettingsGroup palette={palette}>
            <SettingsRow Icon={CalendarDays} detail={getResidencyYearLabel(settings.residencyYearEnd, settings.calendarYearMode)} palette={palette} title="Residency Year" onPress={openResidencyDrawer} />
            <SettingsDivider palette={palette} />
            <SettingsRow Icon={CalendarDays} detail={settings.calendarYearMode ? "Calendar year, Jan-Dec" : "India fiscal year, Apr-Mar"} palette={palette} title="Year Mode" onPress={openResidencyDrawer} />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection palette={palette} title="Appearance">
          <SettingsGroup palette={palette}>
            <SettingsRow Icon={Monitor} detail={getAppearanceLabel(settings.appearance)} palette={palette} title="Theme" onPress={() => setActiveDrawer("appearance")} />
          </SettingsGroup>
        </SettingsSection>
      </ScrollView>

      <ResidencySettingsDrawer
        calendarYearMode={draftCalendarYearMode}
        palette={palette}
        visible={activeDrawer === "residency"}
        year={draftResidencyYear}
        onCalendarYearModeChange={setDraftCalendarYearMode}
        onClose={() => setActiveDrawer(null)}
        onConfirm={() => void applyResidencySettings(draftResidencyYear, draftCalendarYearMode)}
        onYearChange={setDraftResidencyYear}
      />
      <ChoiceSettingsDrawer
        Icon={Monitor}
        detail="Set the app appearance preference."
        options={appearanceOptions.map(({ value, label, Icon }) => ({ value, label, Icon }))}
        palette={palette}
        selectedValue={settings.appearance}
        title="Theme"
        visible={activeDrawer === "appearance"}
        onClose={() => setActiveDrawer(null)}
        onSelect={(value) => {
          setActiveDrawer(null);
          void updateSetting("appearance", value as typeof settings.appearance);
        }}
      />
    </>
  );
}

function SettingsSection({ children, palette, title }: { children: ReactNode; palette: SettingsPalette; title: string }) {
  return (
    <View style={styles.section}>
      <Text className="text-lg font-bold leading-6" style={[styles.sectionTitle, { color: palette.section }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function SettingsGroup({ children, palette }: { children: ReactNode; palette: SettingsPalette }) {
  return <View style={[styles.group, { backgroundColor: palette.group, borderColor: palette.groupBorder }]}>{children}</View>;
}

function SettingsRow({
  Icon,
  accessory,
  destructive = false,
  detail,
  disabled = false,
  palette,
  title,
  onPress
}: {
  Icon: SettingsIcon;
  accessory?: ReactNode;
  destructive?: boolean;
  detail?: string;
  disabled?: boolean;
  palette: SettingsPalette;
  title: string;
  onPress?: () => void;
}) {
  const iconColor = destructive ? palette.danger : disabled ? palette.disabled : palette.icon;
  const titleColor = destructive ? palette.danger : disabled ? palette.disabled : palette.foreground;
  const detailColor = disabled ? palette.disabled : palette.muted;
  const content = (
    <>
      <View style={styles.iconSlot}>
        <Icon size={24} color={iconColor} strokeWidth={iconStrokeWidth} />
      </View>
      <View style={styles.rowCopy}>
        <Text className="text-base font-semibold leading-[22px]" adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={1} style={[styles.rowTitle, { color: titleColor }]}>
          {title}
        </Text>
        {detail ? (
          <Text className="text-xs font-medium leading-[17px]" numberOfLines={1} style={[styles.rowDetail, { color: detailColor }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {accessory ?? (onPress ? <ChevronRight size={28} color={disabled ? palette.disabled : palette.chevron} strokeWidth={iconStrokeWidth + 0.25} /> : null)}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        style={disabled ? styles.disabledRow : null}
        onPress={onPress}
      >
        <View style={styles.row}>{content}</View>
      </Pressable>
    );
  }

  return <View style={[styles.row, disabled ? styles.disabledRow : null]}>{content}</View>;
}

function SettingsDivider({ palette }: { palette: SettingsPalette }) {
  return <View style={[styles.divider, { backgroundColor: palette.divider }]} />;
}

function SettingsDrawerShell({
  children,
  palette,
  visible,
  onClose
}: {
  children: ReactNode;
  palette: SettingsPalette;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      dragY.value = 0;
      progress.value = withSpring(1, {
        damping: 24,
        mass: 0.86,
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
  }, [dragY, progress, visible]);

  const drawerGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-18, 18])
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > 92 || event.velocityY > 760;
          if (shouldClose) {
            runOnJS(onClose)();
            return;
          }

          dragY.value = withSpring(0, {
            damping: 22,
            mass: 0.82,
            stiffness: 230
          });
        }),
    [dragY, onClose]
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(dragY.value, [0, 260], [1, 0.18], Extrapolation.CLAMP)
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [430, 0]) + dragY.value },
      { scale: interpolate(dragY.value, [0, 260], [1, 0.985], Extrapolation.CLAMP) }
    ]
  }));

  if (!isRendered) return null;

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.drawerBackdrop }, backdropStyle]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close settings drawer" style={StyleSheet.absoluteFill} onPress={onClose} />
        <GestureDetector gesture={drawerGesture}>
          <Animated.View
            style={[
              styles.settingsDrawer,
              {
                backgroundColor: palette.drawer,
                borderColor: palette.groupBorder,
                paddingBottom: Math.max(insets.bottom, 14) + 6
              },
              drawerStyle
            ]}
          >
            <View style={styles.drawerHandleTouchArea}>
              <View style={[styles.drawerHandle, { backgroundColor: palette.drawerHandle }]} />
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

function ChoiceSettingsDrawer({
  Icon,
  detail,
  options,
  palette,
  selectedValue,
  title,
  visible,
  onClose,
  onSelect
}: {
  Icon: SettingsIcon;
  detail: string;
  options: ChoiceOption[];
  palette: SettingsPalette;
  selectedValue: string;
  title: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <SettingsDrawerShell palette={palette} visible={visible} onClose={onClose}>
          <View style={styles.drawerHeader}>
            <View style={[styles.drawerIcon, { backgroundColor: palette.control }]}>
              <Icon size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </View>
            <View style={styles.drawerHeaderText}>
              <Text className="text-lg font-extrabold leading-6" style={[styles.drawerTitle, { color: palette.foreground }]}>
                {title}
              </Text>
              <Text className="text-xs font-medium leading-[17px]" numberOfLines={1} style={{ color: palette.muted }}>
                {detail}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Dismiss ${title}`} hitSlop={8} style={[styles.drawerCloseButton, { backgroundColor: palette.control }]} onPress={onClose}>
              <X size={18} color={palette.muted} strokeWidth={iconStrokeWidth} />
            </Pressable>
          </View>

          <View style={styles.drawerOptionList}>
            {options.map((option) => {
              const selected = option.value === selectedValue;
              const OptionIcon = option.Icon;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={selected ? { selected: true } : undefined}
                  style={[
                    styles.drawerOption,
                    {
                      backgroundColor: selected ? palette.selectedControl : palette.control,
                      borderColor: selected ? palette.tint : palette.controlBorder
                    }
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  {OptionIcon ? <OptionIcon size={18} color={selected ? palette.tint : palette.muted} strokeWidth={iconStrokeWidth} /> : null}
                  <View style={styles.drawerOptionCopy}>
                    <Text className="text-sm font-bold leading-5" style={{ color: palette.foreground }}>
                      {option.label}
                    </Text>
                    {option.detail ? (
                      <Text className="text-xs font-medium leading-[17px]" numberOfLines={1} style={{ color: palette.muted }}>
                        {option.detail}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.radioOuter, { borderColor: selected ? palette.tint : palette.controlBorder }]}>
                    {selected ? <View style={[styles.radioInner, { backgroundColor: palette.tint }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
    </SettingsDrawerShell>
  );
}

function ResidencySettingsDrawer({
  calendarYearMode,
  palette,
  visible,
  year,
  onCalendarYearModeChange,
  onClose,
  onConfirm,
  onYearChange
}: {
  calendarYearMode: boolean;
  palette: SettingsPalette;
  visible: boolean;
  year: number;
  onCalendarYearModeChange: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
  onYearChange: (value: number) => void;
}) {
  return (
    <SettingsDrawerShell palette={palette} visible={visible} onClose={onClose}>
          <View style={styles.drawerHeader}>
            <View style={[styles.drawerIcon, { backgroundColor: palette.control }]}>
              <CalendarDays size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </View>
            <View style={styles.drawerHeaderText}>
              <Text className="text-lg font-extrabold leading-6" style={[styles.drawerTitle, { color: palette.foreground }]}>
                Residency Year
              </Text>
              <Text className="text-xs font-medium leading-[17px]" numberOfLines={1} style={{ color: palette.muted }}>
                {calendarYearMode ? "Calendar year, Jan-Dec" : "India fiscal year, Apr-Mar"}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss residency year" hitSlop={8} style={[styles.drawerCloseButton, { backgroundColor: palette.control }]} onPress={onClose}>
              <X size={18} color={palette.muted} strokeWidth={iconStrokeWidth} />
            </Pressable>
          </View>

          <View style={[styles.drawerYearStepper, { backgroundColor: palette.control, borderColor: palette.controlBorder }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous year" hitSlop={8} style={styles.stepperButton} onPress={() => onYearChange(Math.max(2000, year - 1))}>
              <ChevronLeft size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </Pressable>
            <View style={styles.yearLabelWrap}>
              <Text className="text-xl font-extrabold leading-7" adjustsFontSizeToFit numberOfLines={1} style={{ color: palette.foreground }}>
                {getResidencyYearLabel(year, calendarYearMode)}
              </Text>
              <Text className="text-xs font-medium leading-[17px]" numberOfLines={1} style={{ color: palette.muted }}>
                {calendarYearMode ? "Calendar year" : "India FY"}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Next year" hitSlop={8} style={styles.stepperButton} onPress={() => onYearChange(Math.min(2100, year + 1))}>
              <ChevronRight size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </Pressable>
          </View>

          <View style={styles.drawerOptionList}>
            {fiscalYearOptions.map((option) => {
              const selected = option.value === "calendar" ? calendarYearMode : !calendarYearMode;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={selected ? { selected: true } : undefined}
                  style={[
                    styles.drawerOption,
                    {
                      backgroundColor: selected ? palette.selectedControl : palette.control,
                      borderColor: selected ? palette.tint : palette.controlBorder
                    }
                  ]}
                  onPress={() => onCalendarYearModeChange(option.value === "calendar")}
                >
                  <View style={styles.drawerOptionCopy}>
                    <Text className="text-sm font-bold leading-5" style={{ color: palette.foreground }}>
                      {option.label}
                    </Text>
                    <Text className="text-xs font-medium leading-[17px]" numberOfLines={1} style={{ color: palette.muted }}>
                      {option.detail}
                    </Text>
                  </View>
                  <View style={[styles.radioOuter, { borderColor: selected ? palette.tint : palette.controlBorder }]}>
                    {selected ? <View style={[styles.radioInner, { backgroundColor: palette.tint }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.drawerActions}>
            <Pressable accessibilityRole="button" style={[styles.secondaryAction, { backgroundColor: palette.control, borderColor: palette.controlBorder }]} onPress={onClose}>
              <Text className="text-sm font-bold leading-5" style={{ color: palette.foreground }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={[styles.primaryAction, { backgroundColor: palette.tint }]} onPress={onConfirm}>
              <Check size={18} color={palette.tintForeground} strokeWidth={iconStrokeWidth} />
              <Text className="text-sm font-bold leading-5" style={{ color: palette.tintForeground }}>
                Confirm
              </Text>
            </Pressable>
          </View>
    </SettingsDrawerShell>
  );
}

function BackupStatusMessage({ palette, status }: { palette: SettingsPalette; status: BackupStatus }) {
  const isError = status.tone === "error";
  const isSuccess = status.tone === "success";
  const Icon = isError ? XCircle : CheckCircle2;
  const iconColor = isError ? palette.danger : isSuccess ? palette.success : palette.info;
  const backgroundColor = isError ? palette.errorBack : isSuccess ? palette.successBack : palette.infoBack;

  return (
    <View style={[styles.statusMessage, { backgroundColor, borderColor: iconColor }]}>
      <Icon size={20} color={iconColor} strokeWidth={iconStrokeWidth} />
      <Text className="flex-1 text-xs font-medium leading-[17px]" style={[styles.statusText, { color: palette.foreground }]}>
        {status.message}
      </Text>
    </View>
  );
}

function getResidencyYearLabel(year: number, calendarYearMode: boolean) {
  if (calendarYearMode) return String(year);
  return `FY ${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
}

function getAppearanceLabel(value: "system" | "light" | "dark") {
  if (value === "system") return "System";
  return value === "light" ? "Light" : "Dark";
}

function getGoogleDriveDetail({ connected, isExpoGo, unavailable }: { connected: boolean; isExpoGo: boolean; unavailable: boolean }) {
  if (isExpoGo) return "Needs development build";
  if (unavailable) return "OAuth setup missing";
  return connected ? "Connected" : "Not connected";
}

function formatBackupTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getSettingsPalette(isDark: boolean) {
  const neutral = getNeutralPalette(isDark);

  return {
    screen: neutral.backgroundPrimary,
    group: isDark ? "#1c1c1e" : "#f4f4f5",
    groupBorder: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    control: isDark ? "#2c2c2e" : "#ffffff",
    controlBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    divider: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
    foreground: neutral.foreground,
    muted: neutral.foregroundSecondary,
    section: neutral.foregroundSecondary,
    icon: neutral.foreground,
    chevron: neutral.foregroundTertiary,
    disabled: isDark ? "#5f5f63" : "#a7a7ad",
    switchOff: isDark ? "#3a3a3c" : "#d1d1d6",
    switchOn: neutral.primary,
    switchThumb: isDark ? neutral.primaryForeground : "#ffffff",
    switchOnThumb: neutral.primaryForeground,
    tint: neutral.primary,
    tintForeground: neutral.primaryForeground,
    danger: isDark ? "#ff453a" : statusColors.error,
    success: isDark ? "#30d158" : statusColors.success,
    info: neutral.foregroundSecondary,
    errorBack: isDark ? "rgba(255,69,58,0.14)" : "rgba(220,38,38,0.09)",
    successBack: isDark ? "rgba(48,209,88,0.14)" : "rgba(22,163,74,0.09)",
    infoBack: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    drawerBackdrop: isDark ? "rgba(0,0,0,0.58)" : "rgba(0,0,0,0.26)",
    drawer: isDark ? "#1c1c1e" : "#ffffff",
    drawerHandle: isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.18)",
    selectedControl: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"
  };
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  title: {
    fontSize: 30,
    letterSpacing: 0,
    lineHeight: 38
  },
  section: {
    gap: 10
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 24,
    paddingHorizontal: 18
  },
  group: {
    borderCurve: "continuous",
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    minHeight: 68,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  disabledRow: {
    opacity: 0.62
  },
  iconSlot: {
    alignItems: "center",
    justifyContent: "center",
    width: 30
  },
  rowCopy: {
    flex: 1,
    minWidth: 0
  },
  rowTitle: {
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 22
  },
  rowDetail: {
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 17,
    marginTop: 2
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64
  },
  stepperButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  yearLabelWrap: {
    alignItems: "center",
    flex: 1,
    minWidth: 0
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  settingsDrawer: {
    borderCurve: "continuous",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 8,
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.18,
    shadowRadius: 30
  },
  drawerHandleTouchArea: {
    alignItems: "center",
    height: 34,
    justifyContent: "center"
  },
  drawerHandle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    width: 44
  },
  drawerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  drawerIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  drawerHeaderText: {
    flex: 1,
    minWidth: 0
  },
  drawerCloseButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  drawerTitle: {
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 24
  },
  drawerOptionList: {
    gap: 9,
    width: "100%"
  },
  drawerOption: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%"
  },
  drawerOptionCopy: {
    flex: 1,
    minWidth: 0
  },
  radioOuter: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20
  },
  radioInner: {
    borderRadius: 999,
    height: 9,
    width: 9
  },
  drawerYearStepper: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    minHeight: 68,
    paddingHorizontal: 12
  },
  drawerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  secondaryAction: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: "center"
  },
  primaryAction: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 17,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    height: 48,
    justifyContent: "center"
  },
  statusMessage: {
    alignItems: "flex-start",
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 18,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  statusText: {
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 17
  }
});
