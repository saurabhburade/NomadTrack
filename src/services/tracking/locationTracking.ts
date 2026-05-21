import * as Location from "expo-location";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { enqueueGeocodeJob, insertLocationPoint, readLocationPointsForDate, readSettings } from "../../db/database";
import { toIsoDate, uuid } from "../../lib/utils";
import { recalculateDayForPoints } from "../calculations/dayAssignment";
import { processGeocodeQueue } from "../geocoding/geocodeQueue";
import type { TrackingIntervalHours } from "../../types/models";

export const LOCATION_TASK_NAME = "travel-nri-background-location";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  const payload = data as { locations?: Location.LocationObject[] };
  const locations = payload.locations ?? [];
  for (const location of locations) {
    await persistLocation(location, "gps");
  }
});

export async function requestTrackingPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === Location.PermissionStatus.GRANTED;
}

export async function startBackgroundTracking(interval: TrackingIntervalHours) {
  if (interval === "manual") return stopBackgroundTracking();
  const hasPermission = await requestTrackingPermissions();
  if (!hasPermission) return false;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: interval * 60 * 60 * 1000,
    distanceInterval: 5000,
    deferredUpdatesInterval: interval * 60 * 60 * 1000,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: "Travel tracking active",
      notificationBody: "Updating your private travel history in the background."
    },
    showsBackgroundLocationIndicator: false
  });
  return true;
}

export async function stopBackgroundTracking() {
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

async function persistLocation(location: Location.LocationObject, requestedSource: "gps" | "manual") {
  const network = await Network.getNetworkStateAsync();
  const source = network.isInternetReachable ? requestedSource : "gps_offline";
  const point = {
    id: uuid("loc"),
    timestamp: new Date(location.timestamp).toISOString(),
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? 0,
    altitude: location.coords.altitude ?? undefined,
    speed: location.coords.speed ?? undefined,
    heading: location.coords.heading ?? undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    source,
    reverseGeocodeStatus: network.isInternetReachable ? "pending" : "pending"
  } as const;

  await insertLocationPoint(point);
  await enqueueGeocodeJob(point);
  if (network.isInternetReachable) {
    await processGeocodeQueue();
  }

  const settings = await readSettings();
  const dayPoints = await readLocationPointsForDate(toIsoDate(point.timestamp));
  await recalculateDayForPoints(dayPoints, settings);
}

export async function notifyIfGpsStale(lastLocationIso?: string) {
  if (!lastLocationIso) return;
  const hours = (Date.now() - new Date(lastLocationIso).getTime()) / 36e5;
  if (hours < 24) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "No location update in 24h",
      body: "Open Travel NRI Tracker to refresh your travel history."
    },
    trigger: null
  });
}
