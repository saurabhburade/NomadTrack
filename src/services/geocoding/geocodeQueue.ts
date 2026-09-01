import * as Location from "expo-location";
import * as Network from "expo-network";
import { getPendingGeocodeJobs, readLocationPointsForDate, readSettings, updateGeocodeJob, updateLocationGeocode } from "../../db/database";
import { toIsoDate } from "../../lib/utils";
import { recalculateDayForPoints } from "../calculations/dayAssignment";
import { resolveCountryFromBoundaries } from "./countryBoundaryLookup";

type ReverseGeocodeResult = {
  countryCode: string;
  countryName: string;
  region?: string;
  city?: string;
  timezone?: string;
};

const backoffMinutes = [5, 30, 120, 720, 1440];
const legacyMissingEndpointError = "Reverse geocoding endpoint is not configured";
const reverseGeocodeTimeoutMs = 60 * 1000;
const nativeDisagreementAccuracyThresholdMeters = 5000;

export async function processGeocodeQueue() {
  const network = await Network.getNetworkStateAsync();
  const jobs = await getPendingGeocodeJobs();
  let processed = 0;
  for (const job of jobs) {
    try {
      const hasLocalCountry = job.location_reverse_geocode_status === "done" && Boolean(job.location_country_code && job.location_country_name);
      if (hasLocalCountry) {
        if (!isRetryDue(job.retry_count, job.last_attempt_at ?? undefined, job.error ?? undefined)) continue;
        if (!network.isInternetReachable) continue;

        await updateGeocodeJob(job.id, "processing", job.retry_count);
        const nativeResult = await reverseGeocode(job.latitude, job.longitude);
        await completeGeocodeJob(job, chooseNativeConfirmationResult(job, nativeResult));
        processed += 1;
        continue;
      }

      const localCountry = resolveCountryFromBoundaries(job.latitude, job.longitude);
      if (localCountry) {
        await completeGeocodeJob(job, localCountry);
        processed += 1;
        continue;
      }

      if (!isRetryDue(job.retry_count, job.last_attempt_at ?? undefined, job.error ?? undefined)) continue;
      if (!network.isInternetReachable) {
        continue;
      }

      await updateGeocodeJob(job.id, "processing", job.retry_count);
      const result = await reverseGeocodeWithBoundaryFallback(job.latitude, job.longitude);
      await completeGeocodeJob(job, result);
      processed += 1;
    } catch (error) {
      await updateGeocodeJob(job.id, "failed", job.retry_count + 1, error instanceof Error ? error.message : "Unknown error");
    }
  }

  return { processed, skipped: !network.isInternetReachable };
}

function chooseNativeConfirmationResult(
  job: {
    location_accuracy: number | null;
    location_country_code: string | null;
    location_country_name: string | null;
  },
  nativeResult: ReverseGeocodeResult
): ReverseGeocodeResult {
  if (!job.location_country_code || !job.location_country_name) return nativeResult;
  if (nativeResult.countryCode === job.location_country_code) return nativeResult;

  if ((job.location_accuracy ?? Number.POSITIVE_INFINITY) > nativeDisagreementAccuracyThresholdMeters) {
    console.warn(
      `[geocode] Native country ${nativeResult.countryCode} disagreed with local boundary ${job.location_country_code}; keeping local country because GPS accuracy was poor.`
    );
    return {
      countryCode: job.location_country_code,
      countryName: job.location_country_name,
      timezone: nativeResult.timezone
    };
  }

  console.warn(`[geocode] Native country ${nativeResult.countryCode} disagreed with local boundary ${job.location_country_code}; using native result.`);
  return nativeResult;
}

async function completeGeocodeJob(
  job: {
    id: string;
    location_point_id: string;
    retry_count: number;
    timestamp: string;
  },
  result: ReverseGeocodeResult
) {
  await updateLocationGeocode(job.location_point_id, result);
  await updateGeocodeJob(job.id, "done", job.retry_count);
  const settings = await readSettings();
  const dayPoints = await readLocationPointsForDate(toIsoDate(job.timestamp));
  await recalculateDayForPoints(dayPoints, settings);
}

function isRetryDue(retryCount: number, lastAttemptAt?: string, lastError?: string) {
  if (!lastAttemptAt) return true;
  if (lastError === legacyMissingEndpointError) return true;
  const waitMinutes = backoffMinutes[Math.min(retryCount, backoffMinutes.length - 1)] ?? 1440;
  return Date.now() - new Date(lastAttemptAt).getTime() >= waitMinutes * 60 * 1000;
}

async function reverseGeocodeWithBoundaryFallback(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  try {
    return await reverseGeocode(latitude, longitude);
  } catch (error) {
    const fallback = resolveCountryFromBoundaries(latitude, longitude);
    if (fallback) {
      console.warn(`[geocode] Platform reverse geocode failed; using local country boundary: ${getErrorMessage(error)}`);
      return fallback;
    }
    throw error;
  }
}

async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const [address] = await withTimeout("Reverse geocoding", Location.reverseGeocodeAsync({ latitude, longitude }), reverseGeocodeTimeoutMs);
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

async function withTimeout<T>(label: string, promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
