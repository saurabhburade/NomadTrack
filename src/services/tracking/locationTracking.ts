import * as Location from "expo-location";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";
import { enqueueGeocodeJob, insertLocationPoint, readLocationPointsForDate, readSettings, writeSetting } from "../../db/database";
import { toIsoDate, uuid } from "../../lib/utils";
import { runAutoBackupIfDue } from "../backup/driveBackup";
import { recalculateDayForPoints } from "../calculations/dayAssignment";
import { resolveCountryFromBoundaries } from "../geocoding/countryBoundaryLookup";
import { processGeocodeQueue } from "../geocoding/geocodeQueue";
import { showStatusNotification } from "../notifications/statusNotifications";
import type { LocationSource, TrackingIntervalHours } from "../../types/models";

export const LOCATION_TASK_NAME = "travel-nri-background-location";

type PersistableLocation = {
  timestamp: number | string;
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
  };
};

type CoreLocationWakeEvent = PersistableLocation & {
  id: string;
  source: LocationSource;
};

type ForceQuitLocationModule = {
  startMonitoring?: () => Promise<boolean>;
  stopMonitoring?: () => Promise<boolean>;
  getPendingLocationEvents?: () => Promise<CoreLocationWakeEvent[]>;
  markLocationEventsProcessed?: (ids: string[]) => Promise<boolean>;
};

type CoreLocationWakeTriggerOptions = {
  backupPendingEvents?: boolean;
  backupShortcutsEvents?: boolean;
  shortcutsOnly?: boolean;
};

type PersistLocationOptions = {
  notify?: boolean;
};

const forceQuitLocationModule = NativeModules.ForceQuitLocationModule as ForceQuitLocationModule | undefined;
const forceQuitLocationEventName = "ForceQuitLocationEvent";
const shortcutAutomationSources = new Set<LocationSource>(["shortcuts"]);
const forceQuitLocationSources = new Set<LocationSource>(["visit", "slc", "region-exit", "region-enter", "shortcuts", "charger-connected"]);
const locationTriggerLabels: Record<LocationSource, string> = {
  manual: "T1 manual",
  gps: "T2 auto-gps",
  gps_offline: "T2 auto-gps-offline",
  slc: "T3 significant-change",
  visit: "T4 visit",
  "region-exit": "T5 region-exit",
  "region-enter": "T6 region-enter",
  shortcuts: "T7 shortcuts",
  "charger-connected": "T8 charger",
  photo: "T9 photo",
  import: "T10 import"
};

let forceQuitLocationListenerRegistered = false;
let forceQuitLocationDrainPromise: Promise<void> | undefined;

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const payload = data as { locations?: Location.LocationObject[] };
  const locations = payload.locations ?? [];
  for (const location of locations) {
    try {
      await handleAutomaticLocation(location);
    } catch (taskError) {
      console.warn(`[location] Background location task failed: ${getErrorMessage(taskError)}`);
    }
  }
});

export async function requestTrackingPermissions() {
  const backgroundAvailable = await Location.isBackgroundLocationAvailableAsync();
  if (!backgroundAvailable) return false;
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  return isBackgroundLocationPermissionGranted(background);
}

export async function hasBackgroundTrackingPermission() {
  const backgroundAvailable = await Location.isBackgroundLocationAvailableAsync();
  if (!backgroundAvailable) return false;
  const background = await Location.getBackgroundPermissionsAsync();
  return isBackgroundLocationPermissionGranted(background);
}

function isBackgroundLocationPermissionGranted(permission: Location.PermissionResponse | Location.LocationPermissionResponse) {
  if (permission.status !== Location.PermissionStatus.GRANTED) return false;
  if (Platform.OS !== "ios") return true;

  const iosScope = (permission as Location.LocationPermissionResponse).ios?.scope;
  return !iosScope || iosScope === "always";
}

export async function startBackgroundTracking(interval: TrackingIntervalHours) {
  if (interval === "manual") return stopBackgroundTracking();
  const hasPermission = await requestTrackingPermissions();
  if (!hasPermission) return false;

  await registerBackgroundLocationTask(interval);
  return true;
}

export async function resumeBackgroundTracking(interval: TrackingIntervalHours, options: CoreLocationWakeTriggerOptions = {}) {
  if (interval === "manual") return stopBackgroundTracking();
  const hasPermission = await hasBackgroundTrackingPermission();
  if (!hasPermission) return false;

  await registerBackgroundLocationTask(interval, options);
  return true;
}

async function registerBackgroundLocationTask(interval: Exclude<TrackingIntervalHours, "manual">, options: CoreLocationWakeTriggerOptions = {}) {
  await startCoreLocationWakeTriggers(options);

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  const intervalMs = getTrackingIntervalMs(interval);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: intervalMs,
    distanceInterval: 5000,
    deferredUpdatesInterval: intervalMs,
    pausesUpdatesAutomatically: true,
    ...(Platform.OS === "android"
      ? {
          foregroundService: {
            notificationTitle: "NomadTrack",
            notificationBody: "Background location is active."
          }
        }
      : {}),
    showsBackgroundLocationIndicator: true
  });
}

function getTrackingIntervalMs(interval: Exclude<TrackingIntervalHours, "manual">) {
  if (interval === "1m") return 60 * 1000;
  return interval * 60 * 60 * 1000;
}

export async function stopBackgroundTracking() {
  if (Platform.OS === "ios" && forceQuitLocationModule?.stopMonitoring) {
    await forceQuitLocationModule.stopMonitoring();
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  return true;
}

export async function captureManualLocation() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location permission denied");
  }
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  await persistLocation(location, "manual");
}

export async function captureAutomaticLocationNow() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location permission denied");
  }
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  await handleAutomaticLocation(location);
}

async function persistLocation(location: PersistableLocation, requestedSource: LocationSource, options: PersistLocationOptions = {}) {
  const triggerLabel = locationTriggerLabels[requestedSource];
  console.info(`[location] ${triggerLabel} capture requested`);

  if (options.notify !== false) {
    await showStatusNotification("Taking location", `${triggerLabel} Updating today's travel location.`, { identifier: "nomadtrack-status-location" });
  }

  const network = await Network.getNetworkStateAsync();
  const source = network.isInternetReachable || requestedSource !== "gps" ? requestedSource : "gps_offline";
  const timestamp = typeof location.timestamp === "string" ? location.timestamp : new Date(location.timestamp).toISOString();
  const localCountry = resolveCountryFromBoundaries(location.coords.latitude, location.coords.longitude);
  const point = {
    id: uuid("loc"),
    timestamp,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? 0,
    altitude: location.coords.altitude ?? undefined,
    speed: location.coords.speed ?? undefined,
    heading: location.coords.heading ?? undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    countryCode: localCountry?.countryCode,
    countryName: localCountry?.countryName,
    source,
    reverseGeocodeStatus: localCountry ? "done" : "pending"
  } as const;

  await insertLocationPoint(point);
  await enqueueGeocodeJob(point);
  if (localCountry) {
    void processGeocodeQueue().catch((error) => {
      console.warn(`[geocode] Native confirmation failed: ${getErrorMessage(error)}`);
    });
  } else {
    await processGeocodeQueue();
  }

  const settings = await readSettings();
  const dayPoints = await readLocationPointsForDate(toIsoDate(point.timestamp));
  await recalculateDayForPoints(dayPoints, settings);
  if (shortcutAutomationSources.has(source)) {
    await writeSetting("shortcutsAutomationLastVerifiedAt", timestamp);
  }
}

async function handleAutomaticLocation(location: PersistableLocation, source: LocationSource = "gps") {
  await persistLocation(location, source, { notify: false });
  await runBackupAfterLocation();
}

export async function startCoreLocationWakeTriggers(options: CoreLocationWakeTriggerOptions = {}) {
  if (Platform.OS !== "ios" || !forceQuitLocationModule?.startMonitoring) return false;

  registerCoreLocationWakeListener();
  await forceQuitLocationModule.startMonitoring();
  await drainPendingCoreLocationWakeEvents({
    backupPendingEvents: options.backupPendingEvents ?? true,
    backupShortcutsEvents: options.backupShortcutsEvents ?? true,
    shortcutsOnly: options.shortcutsOnly ?? false
  });
  return true;
}

export async function drainPendingShortcutsLocationEvents() {
  if (Platform.OS !== "ios" || !forceQuitLocationModule?.getPendingLocationEvents) return;
  registerCoreLocationWakeListener();
  await drainPendingCoreLocationWakeEvents({
    backupPendingEvents: false,
    backupShortcutsEvents: true,
    shortcutsOnly: true
  });
}

function registerCoreLocationWakeListener() {
  if (forceQuitLocationListenerRegistered || !forceQuitLocationModule) return;
  forceQuitLocationListenerRegistered = true;

  const emitter = new NativeEventEmitter(forceQuitLocationModule as never);
  emitter.addListener(forceQuitLocationEventName, (event: CoreLocationWakeEvent) => {
    void processCoreLocationWakeEvent(event);
  });
}

async function drainPendingCoreLocationWakeEvents(options: Required<CoreLocationWakeTriggerOptions>) {
  if (!forceQuitLocationModule?.getPendingLocationEvents) return;
  forceQuitLocationDrainPromise ??= (async () => {
    try {
      const events = await forceQuitLocationModule.getPendingLocationEvents?.();
      for (const event of events ?? []) {
        if (options.shortcutsOnly && !shortcutAutomationSources.has(event.source)) continue;
        const shouldBackUp = options.backupPendingEvents || (options.backupShortcutsEvents && shortcutAutomationSources.has(event.source));
        await processCoreLocationWakeEvent(event, shouldBackUp);
      }
    } finally {
      forceQuitLocationDrainPromise = undefined;
    }
  })();
  await forceQuitLocationDrainPromise;
}

async function processCoreLocationWakeEvent(event: CoreLocationWakeEvent, backupAfterLocation = true) {
  const source = forceQuitLocationSources.has(event.source) ? event.source : "gps";
  if (backupAfterLocation) {
    if (shortcutAutomationSources.has(source)) {
      await persistLocation(event, source, { notify: false });
      await runBackupAfterLocation();
    } else {
      await handleAutomaticLocation(event, source);
    }
  } else {
    await persistLocation(event, source, { notify: false });
  }
  if (event.id) {
    await forceQuitLocationModule?.markLocationEventsProcessed?.([event.id]);
  }
}

async function runBackupAfterLocation() {
  const backupResult = await runAutoBackupIfDue();
  if (backupResult.status === "failed") {
    console.warn(`[backup] Auto backup after location failed: ${backupResult.error.message}`);
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function notifyIfGpsStale(lastLocationIso?: string) {
  if (!lastLocationIso) return;
  const hours = (Date.now() - new Date(lastLocationIso).getTime()) / 36e5;
  if (hours < 24) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "No location update in 24h",
      body: "Open NomadTrack to refresh your travel history."
    },
    trigger: null
  });
}
