import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, useColorScheme, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing as ReanimatedEasing, Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudUpload,
  Download,
  LogOut,
  Monitor,
  Moon,
  Shield,
  Sun,
  Upload,
  UserRound,
  X,
  XCircle
} from "lucide-react-native";
import { Text } from "../components/ui/text";
import { BackupProgressDialog, type BackupProgressDialogPalette } from "../components/backup/BackupProgressDialog";
import { NativeDivider } from "../components/native/NativeDivider";
import { NativeProgress } from "../components/native/NativeProgress";
import { NativeSettingsScreen, isNativeSettingsScreenAvailable, type SettingsNativeAction } from "../components/native/NativeSettingsScreen";
import { NativeSwitch } from "../components/native/NativeSwitch";
import { LiquidGlassLayer } from "../components/native/LiquidGlassLayer";
import { YearSelectorDrawer, getFiscalYearLabel, type YearSelectorPalette } from "../components/year-selector-drawer";
import { clearAllLocalData } from "../db/database";
import { getNeutralPalette, iconStrokeWidth, statusColors } from "../lib/colors";
import {
  clearGoogleAccessToken,
  getGoogleAccountProfile,
  getGoogleDriveAuthSetup,
  getGoogleDriveConnectionState,
  GoogleLoginRequiredError,
  storeGoogleTokenResponse,
  useGoogleDriveAuthRequest
} from "../services/auth/googleAuth";
import { listDriveBackups, restoreLatestDriveBackup, uploadBackupToDrive, writeLocalBackupFile, type BackupProgress } from "../services/backup/driveBackup";
import { exportLocationCsv } from "../services/export/csvExport";
import { stopBackgroundTracking } from "../services/tracking/locationTracking";
import { useAppStore } from "../store/appStore";

const appearanceOptions = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon }
] as const;

type BackupStatus = {
  tone: "info" | "success" | "error";
  message: string;
};
type GoogleConnectionState = Awaited<ReturnType<typeof getGoogleDriveConnectionState>>;
type GoogleAccountProfile = Awaited<ReturnType<typeof getGoogleAccountProfile>>;
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
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [isResetBusy, setIsResetBusy] = useState(false);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionState>(defaultGoogleConnection);
  const [googleAccount, setGoogleAccount] = useState<GoogleAccountProfile>(null);
  const [activeDrawer, setActiveDrawer] = useState<SettingsDrawer>(null);
  const [draftResidencyYear, setDraftResidencyYear] = useState(settings.residencyYearEnd);
  const [draftCalendarYearMode, setDraftCalendarYearMode] = useState(settings.calendarYearMode);
  const googleAuthSetup = getGoogleDriveAuthSetup();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getSettingsPalette(isDark);
  const googleDriveUnavailable = !googleAuthSetup.canUseGoogleAuth || !googleAuthRequest;
  const googleDriveDetail = getGoogleDriveDetail({
    isExpoGo: googleAuthSetup.isExpoGo,
    unavailable: googleDriveUnavailable,
    connected: googleConnection.isConnected
  });
  const accountTitle = getAccountTitle(googleConnection, googleAccount);
  const accountDetail = getAccountDetail({
    account: googleAccount,
    connected: googleConnection.isConnected,
    googleDriveDetail,
    unavailable: googleDriveUnavailable
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
    setGoogleAccount(nextConnection.isConnected ? await getGoogleAccountProfile() : null);
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
      const result = await uploadBackupToDrive({ onProgress: setBackupProgress });
      setBackupStatus({ tone: "success", message: `Backup successful: ${result.name} updated ${formatBackupTime(result.modifiedTime)}.` });
      await refreshGoogleConnectionState();
      await refresh();
    } catch (error) {
      handleBackupError(error, "Backup failed.");
    } finally {
      setBackupProgress(null);
      setIsBackupBusy(false);
    }
  }

  async function saveLocalBackup() {
    setIsBackupBusy(true);
    try {
      setBackupStatus({ tone: "info", message: "Saving local backup file..." });
      await writeLocalBackupFile({ onProgress: setBackupProgress });
      setBackupStatus({ tone: "success", message: "Local backup file saved." });
    } catch (error) {
      handleBackupError(error, "Could not save local backup.");
    } finally {
      setBackupProgress(null);
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
      setBackupProgress(null);
      setIsBackupBusy(false);
    }
  }

  function confirmRestoreLatestBackup() {
    Alert.alert(
      "Restore latest backup?",
      "This will replace local travel history with the latest Google Drive backup. Older year-scoped backups still restore only their saved date range.",
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
      const result = await restoreLatestDriveBackup({ onProgress: setBackupProgress });
      const backupLabel = result.backup.scope.label;
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
            ? `Restore complete: ${restoredCount} rows from ${backupLabel} backup updated ${formatBackupTime(result.file.modifiedTime)}.`
            : `Restore finished, but this backup only contained settings. No travel history was found in the ${backupLabel} backup.`
      });
      await refreshGoogleConnectionState();
      await setSelectedDate(result.displayDate);
      await refresh();
    } catch (error) {
      handleBackupError(error, "Restore failed.");
    } finally {
      setBackupProgress(null);
      setIsBackupBusy(false);
    }
  }

  function confirmClearDataAndLogout() {
    Alert.alert(
      "Clear data and logout?",
      "This permanently deletes local travel history, trips, pending validation, settings, backup metadata, and the saved Google token on this device, then returns to onboarding. Google Drive backups are not deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear & Logout", style: "destructive", onPress: () => void clearDataAndLogout() }
      ]
    );
  }

  function confirmBackupAndLogout() {
    Alert.alert(
      "Backup and logout?",
      "NomadTrack will upload a fresh Google Drive backup, clear local data and settings from this device, disconnect Google, then return to onboarding.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Backup & Logout", style: "destructive", onPress: () => void backupAndLogout() }
      ]
    );
  }

  async function backupAndLogout() {
    setIsResetBusy(true);
    setIsBackupBusy(true);
    try {
      const canUseBackup = await ensureGoogleDriveLogin();
      if (!canUseBackup) return;

      setBackupStatus({ tone: "info", message: "Uploading backup before logout..." });
      await uploadBackupToDrive({ onProgress: setBackupProgress });
      await clearDeviceAndReturnToOnboarding("Backup complete. Local data cleared and Google disconnected.");
    } catch (error) {
      handleBackupError(error, "Backup and logout failed.");
    } finally {
      setBackupProgress(null);
      setIsBackupBusy(false);
      setIsResetBusy(false);
    }
  }

  async function clearDataAndLogout() {
    setIsResetBusy(true);
    try {
      await clearDeviceAndReturnToOnboarding("Local data cleared and Google disconnected.");
    } catch (error) {
      setBackupStatus({ tone: "error", message: error instanceof Error ? error.message : "Could not clear local data." });
    } finally {
      setIsResetBusy(false);
    }
  }

  async function clearDeviceAndReturnToOnboarding(successMessage: string) {
    await stopBackgroundTracking();
    await clearGoogleAccessToken();
    await clearAllLocalData();
    setBackupStatus({ tone: "success", message: successMessage });
    setGoogleConnection(defaultGoogleConnection);
    await setSelectedDate(new Date().toISOString().slice(0, 10));
    await refresh();
  }

  function handleNativeAction(action: SettingsNativeAction) {
    switch (action) {
      case "residencyYear":
        openResidencyDrawer();
        break;
      case "googleDrive":
        connectGoogleDrive();
        break;
      case "backupNow":
        void backupNow();
        break;
      case "restoreBackup":
        confirmRestoreLatestBackup();
        break;
      case "exportCsv":
        void exportLocationCsv();
        break;
      case "saveLocalBackup":
        void saveLocalBackup();
        break;
      case "disconnectGoogle":
        void disconnectGoogleDrive();
        break;
      case "backupLogout":
        confirmBackupAndLogout();
        break;
      case "clearLogout":
        confirmClearDataAndLogout();
        break;
    }
  }

  if (Platform.OS === "ios" && isNativeSettingsScreenAvailable) {
    return (
      <>
        <NativeSettingsScreen
          appearance={settings.appearance}
          autoBackup={settings.autoBackup}
          backupBusy={isBackupBusy}
          backupStatus={backupStatus}
          bottomPadding={Math.max(insets.bottom, 10) + 126}
          topPadding={insets.top + 20}
          accountDetail={accountDetail}
          accountTitle={accountTitle}
          calendarYearMode={settings.calendarYearMode}
          cloudBackupEnabled={settings.cloudBackupEnabled}
          googleConnected={googleConnection.isConnected}
          googleDriveDetail={googleDriveDetail}
          googleDriveUnavailable={googleDriveUnavailable}
          palette={palette}
          resetBusy={isResetBusy}
          residencyYear={settings.residencyYearEnd}
          onAction={handleNativeAction}
          onAppearanceChange={(value: typeof settings.appearance) => void updateSetting("appearance", value)}
          onAutoBackupChange={(value: boolean) => void updateSetting("autoBackup", value)}
          onCloudBackupEnabledChange={(value: boolean) => void updateSetting("cloudBackupEnabled", value)}
          onResidencyConfirm={(year: number, calendarYearMode: boolean) => void applyResidencySettings(year, calendarYearMode)}
        />
        <BackupProgressDialog
          palette={getBackupProgressDialogPalette(palette)}
          progress={backupProgress}
          visible={Boolean(backupProgress)}
        />
        <YearSelectorDrawer
          calendarYearMode={draftCalendarYearMode}
          palette={getSettingsYearSelectorPalette(palette)}
          visible={activeDrawer === "residency"}
          year={draftResidencyYear}
          onClose={() => setActiveDrawer(null)}
          onConfirm={(year, calendarYearMode) => void applyResidencySettings(year, calendarYearMode)}
        />
      </>
    );
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
        <Text className="text-3xl font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
          Settings
        </Text>

        <SettingsSection palette={palette} title="Account">
          <SettingsGroup palette={palette}>
            <SettingsRow
              Icon={UserRound}
              detail={accountDetail}
              disabled={!googleConnection.isConnected && googleDriveUnavailable}
              palette={palette}
              title={accountTitle}
              onPress={googleConnection.isConnected ? undefined : connectGoogleDrive}
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection palette={palette} title="Backup">
          <SettingsGroup palette={palette}>
            <SettingsRow
              Icon={Shield}
              accessory={
                <NativeSwitch
                  iosBackgroundColor={palette.switchOff}
                  thumbColor={settings.cloudBackupEnabled ? palette.switchOnThumb : palette.switchThumb}
                  offColor={palette.switchOff}
                  onColor={palette.switchOn}
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
                <NativeSwitch
                  iosBackgroundColor={palette.switchOff}
                  thumbColor={settings.autoBackup ? palette.switchOnThumb : palette.switchThumb}
                  offColor={palette.switchOff}
                  onColor={palette.switchOn}
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
              accessory={isBackupBusy ? <NativeProgress color={palette.tint} style={styles.rowProgress} /> : undefined}
              detail={googleDriveUnavailable ? "Needs Google Drive" : "Upload latest data"}
              disabled={isBackupBusy || googleDriveUnavailable}
              palette={palette}
              title={isBackupBusy ? "Working..." : "Backup Now"}
              onPress={() => void backupNow()}
            />
            <SettingsDivider palette={palette} />
            <SettingsRow
              Icon={Download}
              accessory={isBackupBusy ? <NativeProgress color={palette.tint} style={styles.rowProgress} /> : undefined}
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
            <SettingsRow
              Icon={Download}
              detail="Local JSON file"
              disabled={isBackupBusy}
              palette={palette}
              title={isBackupBusy ? "Working..." : "Save Local Backup"}
              onPress={() => void saveLocalBackup()}
            />
            <SettingsDivider palette={palette} />
            <SettingsRow Icon={LogOut} destructive detail={googleConnection.isConnected ? "Remove saved token" : "No account connected"} palette={palette} title="Disconnect Google" onPress={() => void disconnectGoogleDrive()} />
            <SettingsDivider palette={palette} />
            <SettingsRow
              Icon={CloudUpload}
              destructive
              detail={googleDriveUnavailable ? "Needs Google Drive" : "Backup, clear, and return to onboarding"}
              disabled={isResetBusy || isBackupBusy || googleDriveUnavailable}
              palette={palette}
              title={isResetBusy ? "Working..." : "Backup & Logout"}
              onPress={confirmBackupAndLogout}
            />
            <SettingsDivider palette={palette} />
            <SettingsRow
              Icon={XCircle}
              destructive
              detail="Clear device and return to onboarding"
              disabled={isResetBusy}
              palette={palette}
              title={isResetBusy ? "Clearing..." : "Clear & Logout"}
              onPress={confirmClearDataAndLogout}
            />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection palette={palette} title="Fiscal Year">
          <SettingsGroup palette={palette}>
            <SettingsRow Icon={CalendarDays} detail={getResidencyYearDetail(settings.residencyYearEnd, settings.calendarYearMode)} palette={palette} title="Residency Year" onPress={openResidencyDrawer} />
          </SettingsGroup>
        </SettingsSection>

        <SettingsSection palette={palette} title="Appearance">
          <SettingsGroup palette={palette}>
            <SettingsRow Icon={Monitor} detail={getAppearanceLabel(settings.appearance)} palette={palette} title="Theme" onPress={() => setActiveDrawer("appearance")} />
          </SettingsGroup>
        </SettingsSection>
      </ScrollView>

      <YearSelectorDrawer
        calendarYearMode={draftCalendarYearMode}
        palette={getSettingsYearSelectorPalette(palette)}
        visible={activeDrawer === "residency"}
        year={draftResidencyYear}
        onClose={() => setActiveDrawer(null)}
        onConfirm={(year, calendarYearMode) => void applyResidencySettings(year, calendarYearMode)}
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
      <BackupProgressDialog
        palette={getBackupProgressDialogPalette(palette)}
        progress={backupProgress}
        visible={Boolean(backupProgress)}
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
        <View style={styles.row}>
          <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={42} tint="systemUltraThinMaterial" style={styles.rowGlassLayer} />
          <View pointerEvents="none" style={[styles.rowGlassOverlay, { backgroundColor: palette.control, borderColor: palette.controlBorder }]} />
          <View style={styles.rowContent}>{content}</View>
        </View>
      </Pressable>
    );
  }

  return <View style={[styles.row, disabled ? styles.disabledRow : null]}>{content}</View>;
}

function SettingsDivider({ palette }: { palette: SettingsPalette }) {
  return <NativeDivider color={palette.divider} style={styles.divider} />;
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
                borderColor: palette.groupBorder,
                paddingBottom: Math.max(insets.bottom, 14) + 6
              },
              drawerStyle
            ]}
          >
            <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={78} tint="systemThinMaterial" style={[StyleSheet.absoluteFill, styles.noPointerEvents]} />
            <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.drawer }]} />
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
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue)
  );

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
          <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={44} tint="systemUltraThinMaterial" tintColor={palette.control} style={StyleSheet.absoluteFill} />
          <X size={18} color={palette.muted} strokeWidth={iconStrokeWidth} />
        </Pressable>
      </View>

      <ChoiceTabs options={options} palette={palette} selectedIndex={selectedIndex} selectedValue={selectedValue} onSelect={onSelect} />
    </SettingsDrawerShell>
  );
}

function ChoiceTabs({
  options,
  palette,
  selectedIndex,
  selectedValue,
  onSelect
}: {
  options: ChoiceOption[];
  palette: SettingsPalette;
  selectedIndex: number;
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={[styles.choiceTabs, { backgroundColor: palette.choiceTabsTrack, borderColor: palette.choiceTabsBorder }]}>
      <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={46} tint="systemUltraThinMaterial" tintColor={palette.control} style={StyleSheet.absoluteFill} />
      {options.map((option, index) => {
        const selected = index === selectedIndex;
        const OptionIcon = option.Icon;
        return (
          <Pressable
            key={option.value}
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={selected ? { selected: true } : undefined}
            hitSlop={4}
            style={[styles.choiceTab, selected && { backgroundColor: palette.choiceTabsActive, borderColor: palette.choiceTabsActiveBorder }]}
            onPress={() => onSelect(option.value ?? selectedValue)}
          >
            {OptionIcon ? <OptionIcon size={22} color={selected ? palette.choiceTabsSelectedText : palette.choiceTabsMutedText} strokeWidth={iconStrokeWidth} /> : null}
            <Text
              className="text-xs font-semibold leading-[17px]"
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              style={[styles.choiceTabLabel, { color: selected ? palette.choiceTabsSelectedText : palette.choiceTabsMutedText }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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

function getResidencyYearDetail(year: number, calendarYearMode: boolean) {
  const modeLabel = calendarYearMode ? "Calendar year, Jan-Dec" : "India fiscal year, Apr-Mar";
  return `${getFiscalYearLabel(year, calendarYearMode)}, ${modeLabel}`;
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

function getAccountTitle(connection: GoogleConnectionState, account: GoogleAccountProfile) {
  if (!connection.isConnected) return "Login Account";
  return account?.name ?? "Google Account";
}

function getAccountDetail({
  account,
  connected,
  googleDriveDetail,
  unavailable
}: {
  account: GoogleAccountProfile;
  connected: boolean;
  googleDriveDetail: string;
  unavailable: boolean;
}) {
  if (connected) return account?.email ?? `Signed in - ${googleDriveDetail}`;
  if (unavailable) return "Google sign-in unavailable";
  return "Connect Google Drive to sign in";
}

function getSettingsYearSelectorPalette(palette: SettingsPalette): YearSelectorPalette {
  const isDark = palette.screen === "#000000";

  return {
    foreground: palette.foreground,
    muted: palette.muted,
    border: palette.controlBorder,
    card: palette.drawer,
    pill: palette.control,
    accent: palette.tint,
    accentForeground: palette.tintForeground,
    blurTint: isDark ? "dark" : "light",
    drawerBackdrop: palette.drawerBackdrop,
    glassFill: palette.control,
    menuGlassFill: palette.drawer,
    glassHighlight: isDark ? "transparent" : "rgba(255,255,255,0.82)",
    glassLowlight: isDark ? "transparent" : "rgba(0,0,0,0.04)",
    glassBorder: palette.controlBorder,
    glassBorderActive: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.18)",
    glassRim: palette.groupBorder,
    glassShadow: "#000000"
  };
}

function getBackupProgressDialogPalette(palette: SettingsPalette): BackupProgressDialogPalette {
  return {
    backdrop: palette.drawerBackdrop,
    border: palette.groupBorder,
    foreground: palette.foreground,
    muted: palette.muted,
    surface: palette.drawer,
    tint: palette.tint,
    track: palette.divider
  };
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
    groupBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)",
    control: isDark ? "#2c2c2e" : "#ffffff",
    controlBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    divider: isDark ? "rgba(84,84,88,0.56)" : "rgba(0,0,0,0.1)",
    foreground: neutral.foreground,
    muted: neutral.foregroundSecondary,
    section: neutral.foregroundSecondary,
    icon: neutral.foreground,
    chevron: neutral.foregroundTertiary,
    disabled: isDark ? "#5f5f63" : "#a7a7ad",
    switchOff: isDark ? "#636366" : "#d1d1d6",
    switchOn: isDark ? "#30d158" : "#34c759",
    switchThumb: "#ffffff",
    switchOnThumb: "#ffffff",
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
    choiceTabsTrack: isDark ? "rgba(44,44,46,0.92)" : "rgba(0,0,0,0.055)",
    choiceTabsBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
    choiceTabsActive: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.94)",
    choiceTabsActiveBorder: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.04)",
    choiceTabsMutedText: neutral.foregroundSecondary,
    choiceTabsSelectedText: neutral.foreground
  };
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingHorizontal: 20,
    paddingTop: 20
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
    borderCurve: "continuous",
    borderRadius: 0,
    flexDirection: "row",
    gap: 14,
    minHeight: 68,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  rowContent: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 14,
    minWidth: 0,
    zIndex: 1
  },
  rowGlassLayer: {
    ...StyleSheet.absoluteFillObject
  },
  rowGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.26
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
  rowProgress: {
    height: 28,
    width: 28
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  noPointerEvents: {
    pointerEvents: "none"
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
    overflow: "hidden",
    width: 36
  },
  drawerTitle: {
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 24
  },
  choiceTabs: {
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    overflow: "hidden",
    padding: 5
  },
  choiceTab: {
    alignItems: "center",
    borderCurve: "continuous",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 58,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  choiceTabLabel: {
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 17
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
