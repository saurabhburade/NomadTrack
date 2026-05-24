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

export type NativeSettingsPalette = Record<string, string>;

export const isNativeSettingsScreenAvailable = false;

export function NativeSettingsScreen(_props: Record<string, unknown>) {
  return null;
}
