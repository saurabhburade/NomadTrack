import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import type { AppSettings } from "../../types/models";
import { runAutoBackupIfDue } from "./driveBackup";

export const BACKGROUND_BACKUP_TASK_NAME = "travel-nri-background-backup";

const backgroundBackupMinimumMinutes = {
  "1m": 1,
  daily: 24 * 60,
  weekly: 7 * 24 * 60,
  monthly: 30 * 24 * 60
} as const;

type BackgroundTaskModule = typeof import("expo-background-task");

const BackgroundTask = loadBackgroundTaskModule();

if (BackgroundTask) {
  TaskManager.defineTask(BACKGROUND_BACKUP_TASK_NAME, async () => {
    const result = await runAutoBackupIfDue();
    return result.status === "failed" ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success;
  });
}

export async function syncBackgroundBackupRegistration(settings: AppSettings) {
  if (Platform.OS === "web" || !BackgroundTask) return;

  const shouldRun = settings.cloudBackupEnabled && settings.autoBackup;
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_BACKUP_TASK_NAME);

  if (!shouldRun) {
    if (isRegistered) await BackgroundTask.unregisterTaskAsync(BACKGROUND_BACKUP_TASK_NAME);
    return;
  }

  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;

  await BackgroundTask.registerTaskAsync(BACKGROUND_BACKUP_TASK_NAME, {
    minimumInterval: backgroundBackupMinimumMinutes[settings.autoBackupFrequency]
  });
}

function loadBackgroundTaskModule(): BackgroundTaskModule | null {
  try {
    // The native module exists only after rebuilding the dev/native app with expo-background-task installed.
    return require("expo-background-task") as BackgroundTaskModule;
  } catch (error) {
    console.warn(`[backup] Background backup unavailable until the native app is rebuilt: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
