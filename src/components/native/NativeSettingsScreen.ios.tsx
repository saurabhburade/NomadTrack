import { type NativeSyntheticEvent, requireNativeComponent, type StyleProp, StyleSheet, UIManager, type ViewProps, type ViewStyle } from "react-native";

export type NativeSettingsPalette = {
  screen: string;
  group: string;
  groupBorder: string;
  control: string;
  controlBorder: string;
  divider: string;
  foreground: string;
  muted: string;
  section: string;
  icon: string;
  chevron: string;
  disabled: string;
  switchOn: string;
  tint: string;
  tintForeground: string;
  danger: string;
  success: string;
  info: string;
  errorBack: string;
  successBack: string;
  infoBack: string;
  drawer: string;
};

type BoolEvent = NativeSyntheticEvent<{ value: boolean }>;
type ActionEvent = NativeSyntheticEvent<{ action: SettingsNativeAction }>;
type AppearanceEvent = NativeSyntheticEvent<{ appearance: "system" | "light" | "dark" }>;
type ResidencyEvent = NativeSyntheticEvent<{ year: number; calendarYearMode: boolean }>;

export type SettingsNativeAction =
  | "residencyYear"
  | "googleDrive"
  | "backupNow"
  | "restoreBackup"
  | "exportCsv"
  | "saveLocalBackup"
  | "disconnectGoogle"
  | "backupLogout"
  | "clearLogout";

type SettingsScreenViewProps = ViewProps & {
  accountDetail: string;
  accountTitle: string;
  appearance: "system" | "light" | "dark";
  autoBackup: boolean;
  backupBusy: boolean;
  backupStatusMessage: string;
  backupStatusTone: "" | "info" | "success" | "error";
  bottomPadding: number;
  topPadding: number;
  calendarYearMode: boolean;
  cloudBackupEnabled: boolean;
  googleConnected: boolean;
  googleDriveDetail: string;
  googleDriveUnavailable: boolean;
  resetBusy: boolean;
  residencyYear: number;

  screenColorValue: string;
  groupColorValue: string;
  groupBorderColorValue: string;
  controlColorValue: string;
  controlBorderColorValue: string;
  dividerColorValue: string;
  foregroundColorValue: string;
  mutedColorValue: string;
  sectionColorValue: string;
  iconColorValue: string;
  chevronColorValue: string;
  disabledColorValue: string;
  switchOnColorValue: string;
  tintColorValue: string;
  tintForegroundColorValue: string;
  dangerColorValue: string;
  successColorValue: string;
  infoColorValue: string;
  errorBackColorValue: string;
  successBackColorValue: string;
  infoBackColorValue: string;
  drawerColorValue: string;

  onAction: (event: ActionEvent) => void;
  onAppearanceChange: (event: AppearanceEvent) => void;
  onAutoBackupChange: (event: BoolEvent) => void;
  onCloudBackupEnabledChange: (event: BoolEvent) => void;
  onResidencyConfirm: (event: ResidencyEvent) => void;
};

type NativeSettingsScreenProps = {
  accountDetail: string;
  accountTitle: string;
  appearance: "system" | "light" | "dark";
  autoBackup: boolean;
  backupBusy: boolean;
  backupStatus?: {
    tone: "info" | "success" | "error";
    message: string;
  } | null;
  bottomPadding: number;
  topPadding: number;
  calendarYearMode: boolean;
  cloudBackupEnabled: boolean;
  googleConnected: boolean;
  googleDriveDetail: string;
  googleDriveUnavailable: boolean;
  palette: NativeSettingsPalette;
  resetBusy: boolean;
  residencyYear: number;
  style?: StyleProp<ViewStyle>;
  onAction: (action: SettingsNativeAction) => void;
  onAppearanceChange: (appearance: "system" | "light" | "dark") => void;
  onAutoBackupChange: (value: boolean) => void;
  onCloudBackupEnabledChange: (value: boolean) => void;
  onResidencyConfirm: (year: number, calendarYearMode: boolean) => void;
};

export const isNativeSettingsScreenAvailable = UIManager.getViewManagerConfig?.("SettingsScreenView") != null;

const SettingsScreenView = isNativeSettingsScreenAvailable ? requireNativeComponent<SettingsScreenViewProps>("SettingsScreenView") : null;

export function NativeSettingsScreen({
  accountDetail,
  accountTitle,
  appearance,
  autoBackup,
  backupBusy,
  backupStatus,
  bottomPadding,
  topPadding,
  calendarYearMode,
  cloudBackupEnabled,
  googleConnected,
  googleDriveDetail,
  googleDriveUnavailable,
  palette,
  resetBusy,
  residencyYear,
  style,
  onAction,
  onAppearanceChange,
  onAutoBackupChange,
  onCloudBackupEnabledChange,
  onResidencyConfirm
}: NativeSettingsScreenProps) {
  if (!SettingsScreenView) return null;

  return (
    <SettingsScreenView
      accountDetail={accountDetail}
      accountTitle={accountTitle}
      appearance={appearance}
      autoBackup={autoBackup}
      backupBusy={backupBusy}
      backupStatusMessage={backupStatus?.message ?? ""}
      backupStatusTone={backupStatus?.tone ?? ""}
      bottomPadding={bottomPadding}
      topPadding={topPadding}
      calendarYearMode={calendarYearMode}
      chevronColorValue={palette.chevron}
      cloudBackupEnabled={cloudBackupEnabled}
      controlBorderColorValue={palette.controlBorder}
      controlColorValue={palette.control}
      dangerColorValue={palette.danger}
      disabledColorValue={palette.disabled}
      dividerColorValue={palette.divider}
      drawerColorValue={palette.drawer}
      errorBackColorValue={palette.errorBack}
      foregroundColorValue={palette.foreground}
      googleConnected={googleConnected}
      googleDriveDetail={googleDriveDetail}
      googleDriveUnavailable={googleDriveUnavailable}
      groupBorderColorValue={palette.groupBorder}
      groupColorValue={palette.group}
      iconColorValue={palette.icon}
      infoBackColorValue={palette.infoBack}
      infoColorValue={palette.info}
      mutedColorValue={palette.muted}
      resetBusy={resetBusy}
      residencyYear={residencyYear}
      screenColorValue={palette.screen}
      sectionColorValue={palette.section}
      style={[styles.host, style]}
      successBackColorValue={palette.successBack}
      successColorValue={palette.success}
      switchOnColorValue={palette.switchOn}
      tintColorValue={palette.tint}
      tintForegroundColorValue={palette.tintForeground}
      onAction={(event) => onAction(event.nativeEvent.action)}
      onAppearanceChange={(event) => onAppearanceChange(event.nativeEvent.appearance)}
      onAutoBackupChange={(event) => onAutoBackupChange(event.nativeEvent.value)}
      onCloudBackupEnabledChange={(event) => onCloudBackupEnabledChange(event.nativeEvent.value)}
      onResidencyConfirm={(event) => onResidencyConfirm(event.nativeEvent.year, event.nativeEvent.calendarYearMode)}
    />
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1
  }
});
