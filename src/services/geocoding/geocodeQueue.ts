import * as Location from "expo-location";
import * as Network from "expo-network";
import {
  getPendingGeocodeJobs,
  readLocationPointsForDate,
  readSettings,
  updateGeocodeJob,
  updateLocationGeocode
} from "../../db/database";
import { recalculateDayForPoints } from "../calculations/dayAssignment";
import { toIsoDate } from "../../lib/utils";

type ReverseGeocodeResult = {
  countryCode: string;
  countryName: string;
  region?: string;
  city?: string;
  timezone?: string;
};

const backoffMinutes = [5, 30, 120, 720, 1440];
const legacyMissingEndpointError = "Reverse geocoding endpoint is not configured";

export async function processGeocodeQueue() {
  const network = await Network.getNetworkStateAsync();
  if (!network.isInternetReachable) return { processed: 0, skipped: true };

  const jobs = await getPendingGeocodeJobs();
  let processed = 0;
  for (const job of jobs) {
    if (!isRetryDue(job.retry_count, job.last_attempt_at ?? undefined, job.error ?? undefined)) continue;
    try {
      await updateGeocodeJob(job.id, "processing", job.retry_count);
      const result = await reverseGeocode(job.latitude, job.longitude);
      await updateLocationGeocode(job.location_point_id, result);
      await updateGeocodeJob(job.id, "done", job.retry_count);
      const settings = await readSettings();
      const dayPoints = await readLocationPointsForDate(toIsoDate(job.timestamp));
      await recalculateDayForPoints(dayPoints, settings);
      processed += 1;
    } catch (error) {
      await updateGeocodeJob(job.id, "failed", job.retry_count + 1, error instanceof Error ? error.message : "Unknown error");
    }
  }

  return { processed, skipped: false };
}

function isRetryDue(retryCount: number, lastAttemptAt?: string, lastError?: string) {
  if (!lastAttemptAt) return true;
  if (lastError === legacyMissingEndpointError) return true;
  const waitMinutes = backoffMinutes[Math.min(retryCount, backoffMinutes.length - 1)] ?? 1440;
  return Date.now() - new Date(lastAttemptAt).getTime() >= waitMinutes * 60 * 1000;
}

async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
  if (!address) throw new Error("Reverse geocoding returned no address");

  const countryCode = address.isoCountryCode?.trim().toUpperCase();
  const countryName = address.country?.trim() || countryCode;
  if (!countryCode || !countryName) throw new Error("Reverse geocoding response missing country");

  return {
    countryCode,
    countryName,
    region: address.region ?? undefined,
    city: address.city ?? address.district ?? address.subregion ?? undefined,
    timezone: address.timezone ?? undefined
  };
}
