import * as SQLite from "expo-sqlite";
import { migrations } from "./migrations";
import { getCurrentLocalYear, uuid } from "../lib/utils";
import { getResidencyYearWindow } from "../services/calculations/residencyYear";
import type { AppSettings, DashboardSummary, LocationPoint, PendingGeocodeJob, Trip } from "../types/models";

let dbPromise: Promise<SQLite.SQLiteDatabase> | undefined;
let dbWriteQueue: Promise<void> = Promise.resolve();
const currentYear = getCurrentLocalYear();
const maxManualEntryDays = 3660;
const manualTripNotes = ["Manual history entry", "Manual day correction"];
const sqliteBusyRetryDelaysMs = [80, 160, 320, 640, 1000];

export const defaultSettings: AppSettings = {
  trackingInterval: 4,
  batterySaver: true,
  trackingPaused: false,
  fiscalYearStartMonth: 4,
  fiscalYearStartDay: 1,
  residencyYearEnd: currentYear,
  calendarYearMode: false,
  dayCountingRule: "longest_duration",
  autoBackup: true,
  autoBackupFrequency: "daily",
  wifiOnlyBackup: true,
  appearance: "system",
  cloudBackupEnabled: true,
  onboardingCompleted: false,
  shortcutsAutomationClaimedAt: undefined,
  shortcutsAutomationLastVerifiedAt: undefined
};

export async function getDb() {
  dbPromise ??= openConfiguredDatabase();
  return dbPromise;
}

export async function runDbWriteTransaction(task: (transactionDb: SQLite.SQLiteDatabase) => Promise<void>) {
  const run = async () => {
    const db = await getDb();
    await withSqliteBusyRetry(async () => {
      await db.withExclusiveTransactionAsync(async (transactionDb) => {
        await task(transactionDb as unknown as SQLite.SQLiteDatabase);
      });
    });
  };

  const queued = dbWriteQueue.then(run, run);
  dbWriteQueue = queued.catch(() => undefined);
  await queued;
}

async function openConfiguredDatabase() {
  const db = await SQLite.openDatabaseAsync("travel-nri-tracker.db");
  await db.execAsync("PRAGMA busy_timeout = 5000;");
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await migrate(db);
  return db;
}

async function withSqliteBusyRetry<T>(task: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      const delayMs = sqliteBusyRetryDelaysMs[attempt];
      if (delayMs === undefined || !isSqliteBusyError(error)) throw error;
      await sleep(delayMs);
    }
  }
}

function isSqliteBusyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("database is locked") || message.includes("SQLITE_BUSY") || message.includes("Error code 5");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync("CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);");
  const applied = await db.getAllAsync<{ version: number }>("SELECT version FROM migrations");
  const appliedVersions = new Set(applied.map((row) => row.version));

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.runAsync("INSERT INTO migrations (version, applied_at) VALUES (?, ?)", migration.version, new Date().toISOString());
    });
  }
}

export async function readSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: keyof AppSettings; value: string }>("SELECT key, value FROM settings");
  const settings = { ...defaultSettings };
  for (const row of rows) {
    settings[row.key] = JSON.parse(row.value) as never;
  }
  return settings;
}

export async function writeSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  await runDbWriteTransaction(async (db) => {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      String(key),
      JSON.stringify(value),
      new Date().toISOString()
    );
  });
}

export async function hasLocalTravelData() {
  const db = await getDb();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT
      (SELECT COUNT(*) FROM location_points) +
      (SELECT COUNT(*) FROM day_records) +
      (SELECT COUNT(*) FROM trips) as count`
  );
  return (result?.count ?? 0) > 0;
}

export async function clearAllLocalData() {
  await runDbWriteTransaction(async (db) => {
    await db.runAsync("DELETE FROM pending_geocode_jobs");
    await db.runAsync("DELETE FROM day_country_segments");
    await db.runAsync("DELETE FROM day_records");
    await db.runAsync("DELETE FROM trips");
    await db.runAsync("DELETE FROM location_points");
    await db.runAsync("DELETE FROM backup_metadata");
    await db.runAsync("DELETE FROM settings");
  });
}

export async function insertLocationPoint(point: Omit<LocationPoint, "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const date = point.timestamp.slice(0, 10);
  await runDbWriteTransaction(async (db) => {
    await db.runAsync(
      "DELETE FROM location_points WHERE timestamp >= ? AND timestamp <= ?",
      `${date}T00:00:00.000Z`,
      `${date}T23:59:59.999Z`
    );
    await db.runAsync(
      `INSERT INTO location_points (
        id, timestamp, latitude, longitude, accuracy, altitude, speed, heading, timezone,
        country_code, country_name, region, city, source, reverse_geocode_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      point.id,
      point.timestamp,
      point.latitude,
      point.longitude,
      point.accuracy,
      point.altitude ?? null,
      point.speed ?? null,
      point.heading ?? null,
      point.timezone ?? null,
      point.countryCode ?? null,
      point.countryName ?? null,
      point.region ?? null,
      point.city ?? null,
      point.source,
      point.reverseGeocodeStatus,
      now,
      now
    );
  });
}

export async function enqueueGeocodeJob(point: Pick<LocationPoint, "id" | "latitude" | "longitude" | "timestamp">) {
  const now = new Date().toISOString();
  await runDbWriteTransaction(async (db) => {
    await db.runAsync(
      `INSERT OR IGNORE INTO pending_geocode_jobs (
        id, location_point_id, latitude, longitude, timestamp, status, retry_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      uuid("geo"),
      point.id,
      point.latitude,
      point.longitude,
      point.timestamp,
      now,
      now
    );
  });
}

export async function getPendingGeocodeJobs(limit = 25) {
  const db = await getDb();
  return db.getAllAsync<PendingGeocodeJobRow>(
    `SELECT
       pending_geocode_jobs.*,
       location_points.accuracy as location_accuracy,
       location_points.country_code as location_country_code,
       location_points.country_name as location_country_name,
       location_points.reverse_geocode_status as location_reverse_geocode_status
     FROM pending_geocode_jobs
     INNER JOIN location_points
       ON location_points.id = pending_geocode_jobs.location_point_id
     WHERE pending_geocode_jobs.status IN ('pending', 'failed')
     ORDER BY pending_geocode_jobs.retry_count ASC, pending_geocode_jobs.timestamp ASC
     LIMIT ?`,
    limit
  );
}

export async function updateGeocodeJob(id: string, status: string, retryCount: number, error?: string) {
  const now = new Date().toISOString();
  await runDbWriteTransaction(async (db) => {
    await db.runAsync(
      "UPDATE pending_geocode_jobs SET status = ?, retry_count = ?, last_attempt_at = ?, error = ?, updated_at = ? WHERE id = ?",
      status,
      retryCount,
      now,
      error ?? null,
      now,
      id
    );
  });
}

export async function updateLocationGeocode(
  id: string,
  result: Pick<LocationPoint, "countryCode" | "countryName" | "region" | "city" | "timezone">
) {
  await runDbWriteTransaction(async (db) => {
    await db.runAsync(
      `UPDATE location_points SET
        country_code = ?, country_name = ?, region = ?, city = ?, timezone = COALESCE(?, timezone),
        reverse_geocode_status = 'done', updated_at = ?
       WHERE id = ?`,
      result.countryCode ?? null,
      result.countryName ?? null,
      result.region ?? null,
      result.city ?? null,
      result.timezone ?? null,
      new Date().toISOString(),
      id
    );
  });
}

export async function readDashboardSummary(): Promise<DashboardSummary> {
  const db = await getDb();
  const settings = await readSettings();
  const window = getResidencyYearWindow(settings, currentYear);
  const currentLocation = await db.getFirstAsync<LocationPointRow>(
    "SELECT * FROM location_points ORDER BY timestamp DESC LIMIT 1"
  );
  const countryTotals = await db.getAllAsync<{ countryCode: string; countryName: string; days: number }>(
    `SELECT primary_country_code as countryCode, primary_country_name as countryName, COUNT(*) as days
     FROM day_records
     WHERE primary_country_code IS NOT NULL
       AND date >= ?
       AND date <= ?
     GROUP BY primary_country_code, primary_country_name
     ORDER BY days DESC`,
    window.startDate,
    window.endDate
  );
  const pending = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM pending_geocode_jobs
     INNER JOIN location_points
       ON location_points.id = pending_geocode_jobs.location_point_id
     WHERE pending_geocode_jobs.status IN ('pending', 'failed')
       AND location_points.reverse_geocode_status != 'done'`
  );
  const backup = await db.getFirstAsync<{ lastBackupAt: string }>(
    "SELECT last_backup_at as lastBackupAt FROM backup_metadata ORDER BY last_backup_at DESC LIMIT 1"
  );

  return {
    currentLocation: currentLocation ? mapLocationRow(currentLocation) : undefined,
    indiaDays: countryTotals.find((row) => row.countryCode === "IN")?.days ?? 0,
    outsideIndiaDays: countryTotals.filter((row) => row.countryCode !== "IN").reduce((sum, row) => sum + row.days, 0),
    countryTotals,
    pendingValidationCount: pending?.count ?? 0,
    lastSyncedAt: backup?.lastBackupAt
  };
}

export async function readLocationPointsForDate(date: string) {
  const db = await getDb();
  const rows = await db.getAllAsync<LocationPointRow>(
    "SELECT * FROM location_points WHERE timestamp >= ? AND timestamp < ? ORDER BY timestamp ASC",
    `${date}T00:00:00.000Z`,
    `${date}T23:59:59.999Z`
  );
  return rows.map(mapLocationRow);
}

export async function readLocationPointsForDashboardYear() {
  const db = await getDb();
  const settings = await readSettings();
  const window = getResidencyYearWindow(settings, currentYear);
  const rows = await db.getAllAsync<LocationPointRow>(
    `SELECT lp.*
     FROM location_points lp
     INNER JOIN (
       SELECT substr(timestamp, 1, 10) as day, MAX(timestamp) as timestamp
       FROM location_points
       WHERE timestamp >= ? AND timestamp <= ?
       GROUP BY day
     ) latest
       ON substr(lp.timestamp, 1, 10) = latest.day
      AND lp.timestamp = latest.timestamp
     ORDER BY lp.timestamp ASC`,
    `${window.startDate}T00:00:00.000Z`,
    `${window.endDate}T23:59:59.999Z`
  );
  return rows.map(mapLocationRow);
}

export async function readDayRecordsForDashboardYear() {
  const db = await getDb();
  const settings = await readSettings();
  const window = getResidencyYearWindow(settings, currentYear);
  return db.getAllAsync<DayRecordRow>(
    "SELECT * FROM day_records WHERE date >= ? AND date <= ? ORDER BY date ASC",
    window.startDate,
    window.endDate
  );
}

export async function readDayRecordsForDateRange(startDate: string, endDate: string) {
  const db = await getDb();
  return db.getAllAsync<DayRecordRow>(
    "SELECT * FROM day_records WHERE date >= ? AND date <= ? ORDER BY date ASC",
    startDate,
    endDate
  );
}

export async function readTrips() {
  const db = await getDb();
  const rows = await db.getAllAsync<TripRow>("SELECT * FROM trips ORDER BY start_date DESC");
  return rows.map((row) => ({
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    countryCode: row.country_code,
    countryName: row.country_name,
    cities: JSON.parse(row.cities) as string[],
    notes: row.notes ?? undefined
  })) satisfies Trip[];
}

export async function insertManualTravelEntry(entry: {
  startDate: string;
  endDate: string;
  countryCode: string;
  countryName: string;
}) {
  const now = new Date().toISOString();
  const tripId = uuid("trip");
  const dates = enumerateIsoDates(entry.startDate, entry.endDate);

  await runDbWriteTransaction(async (db) => {
    await db.runAsync(
      `INSERT INTO trips (
        id, start_date, end_date, country_code, country_name, cities, notes, is_ghost, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '[]', ?, 0, ?, ?)`,
      tripId,
      entry.startDate,
      entry.endDate,
      entry.countryCode,
      entry.countryName,
      "Manual history entry",
      now,
      now
    );

    for (const date of dates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO day_records (
          date, primary_country_code, primary_country_name, countries_visited,
          is_travel_day, is_pending_validation, is_manual_override, notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, 0, 0, 1,
          COALESCE((SELECT notes FROM day_records WHERE date = ?), ?),
          COALESCE((SELECT created_at FROM day_records WHERE date = ?), ?),
          ?
        )`,
        date,
        entry.countryCode,
        entry.countryName,
        JSON.stringify([entry.countryCode]),
        date,
        "Manual history entry",
        date,
        now,
        now
      );

      await db.runAsync("DELETE FROM day_country_segments WHERE date = ?", date);
      await db.runAsync(
        `INSERT INTO day_country_segments (
          id, date, country_code, country_name, start_time, end_time, source,
          confidence, is_pending_validation, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'manual', 1, 0, ?, ?)`,
        uuid("seg"),
        date,
        entry.countryCode,
        entry.countryName,
        `${date}T00:00:00.000Z`,
        `${date}T23:59:59.999Z`,
        now,
        now
      );
    }
  });

  return tripId;
}

export async function updateManualDayEntry(entry: {
  originalDate: string;
  date: string;
  countryCode: string;
  countryName: string;
}) {
  const now = new Date().toISOString();
  const affectedDates = entry.originalDate === entry.date ? [entry.date] : [entry.originalDate, entry.date];

  await runDbWriteTransaction(async (db) => {
    for (const date of affectedDates) {
      await removeManualTripsForDate(db, date, now);
    }

    if (entry.originalDate !== entry.date) {
      await db.runAsync("DELETE FROM day_records WHERE date = ? AND is_manual_override = 1", entry.originalDate);
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO day_records (
        date, primary_country_code, primary_country_name, countries_visited,
        is_travel_day, is_pending_validation, is_manual_override, notes, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, 0, 0, 1, ?,
        COALESCE((SELECT created_at FROM day_records WHERE date = ?), ?),
        ?
      )`,
      entry.date,
      entry.countryCode,
      entry.countryName,
      JSON.stringify([entry.countryCode]),
      "Manual day correction",
      entry.date,
      now,
      now
    );

    await db.runAsync("DELETE FROM day_country_segments WHERE date = ?", entry.date);
    await db.runAsync(
      `INSERT INTO day_country_segments (
        id, date, country_code, country_name, start_time, end_time, source,
        confidence, is_pending_validation, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'manual', 1, 0, ?, ?)`,
      uuid("seg"),
      entry.date,
      entry.countryCode,
      entry.countryName,
      `${entry.date}T00:00:00.000Z`,
      `${entry.date}T23:59:59.999Z`,
      now,
      now
    );

    await db.runAsync(
      `INSERT INTO trips (
        id, start_date, end_date, country_code, country_name, cities, notes, is_ghost, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '[]', ?, 0, ?, ?)`,
      uuid("trip"),
      entry.date,
      entry.date,
      entry.countryCode,
      entry.countryName,
      "Manual day correction",
      now,
      now
    );
  });
}

export async function deleteDayEntry(date: string) {
  const now = new Date().toISOString();

  await runDbWriteTransaction(async (db) => {
    await removeManualTripsForDate(db, date, now);
    await db.runAsync(
      `DELETE FROM pending_geocode_jobs
       WHERE timestamp >= ?
         AND timestamp <= ?`,
      `${date}T00:00:00.000Z`,
      `${date}T23:59:59.999Z`
    );
    await db.runAsync("DELETE FROM location_points WHERE timestamp >= ? AND timestamp <= ?", `${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`);
    await db.runAsync("DELETE FROM day_country_segments WHERE date = ?", date);
    await db.runAsync("DELETE FROM day_records WHERE date = ?", date);
  });
}

export async function clearManualEntryRange(entry: { startDate: string; endDate: string }) {
  const now = new Date().toISOString();
  const dates = enumerateIsoDates(entry.startDate, entry.endDate);

  await runDbWriteTransaction(async (db) => {
    for (const date of dates) {
      await removeManualTripsForDate(db, date, now);
      await db.runAsync("DELETE FROM day_country_segments WHERE date = ?", date);
      await db.runAsync("DELETE FROM day_records WHERE date = ?", date);
    }
  });
}

export async function readDayRecordsForMonth(monthStartIso: string) {
  const db = await getDb();
  const start = monthStartIso.slice(0, 8) + "01";
  const end = new Date(`${start}T00:00:00.000Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return db.getAllAsync<DayRecordRow>(
    "SELECT * FROM day_records WHERE date >= ? AND date < ? ORDER BY date ASC",
    start,
    end.toISOString().slice(0, 10)
  );
}

async function removeManualTripsForDate(db: SQLite.SQLiteDatabase, date: string, now: string) {
  const trips = await db.getAllAsync<TripRow>(
    `SELECT * FROM trips
     WHERE start_date <= ?
       AND end_date >= ?
       AND notes IN (${manualTripNotes.map(() => "?").join(", ")})`,
    date,
    date,
    ...manualTripNotes
  );

  for (const trip of trips) {
    if (trip.start_date === date && trip.end_date === date) {
      await db.runAsync("DELETE FROM trips WHERE id = ?", trip.id);
      continue;
    }

    if (trip.start_date === date) {
      await db.runAsync("UPDATE trips SET start_date = ?, updated_at = ? WHERE id = ?", addIsoDays(date, 1), now, trip.id);
      continue;
    }

    if (trip.end_date === date) {
      await db.runAsync("UPDATE trips SET end_date = ?, updated_at = ? WHERE id = ?", addIsoDays(date, -1), now, trip.id);
      continue;
    }

    await db.runAsync("UPDATE trips SET end_date = ?, updated_at = ? WHERE id = ?", addIsoDays(date, -1), now, trip.id);
    await db.runAsync(
      `INSERT INTO trips (
        id, start_date, end_date, country_code, country_name, cities, notes, is_ghost, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      uuid("trip"),
      addIsoDays(date, 1),
      trip.end_date,
      trip.country_code,
      trip.country_name,
      trip.cities,
      trip.notes,
      now,
      now
    );
  }
}

function addIsoDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function enumerateIsoDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) {
    throw new Error("Invalid date range");
  }

  const days = Math.floor((end.getTime() - cursor.getTime()) / 86_400_000) + 1;
  if (days > maxManualEntryDays) {
    throw new Error(`Manual entries are limited to ${maxManualEntryDays} days at a time.`);
  }

  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export type LocationPointRow = {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timezone: string | null;
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  city: string | null;
  source: LocationPoint["source"];
  reverse_geocode_status: LocationPoint["reverseGeocodeStatus"];
  created_at: string;
  updated_at: string;
};

type PendingGeocodeJobRow = {
  id: string;
  location_point_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: PendingGeocodeJob["status"];
  retry_count: number;
  last_attempt_at: string | null;
  error: string | null;
  location_accuracy: number | null;
  location_country_code: string | null;
  location_country_name: string | null;
  location_reverse_geocode_status: LocationPoint["reverseGeocodeStatus"];
  created_at: string;
  updated_at: string;
};

export type DayRecordRow = {
  date: string;
  primary_country_code: string | null;
  primary_country_name: string | null;
  countries_visited: string;
  is_travel_day: number;
  is_pending_validation: number;
  is_manual_override: number;
  notes: string | null;
};

type TripRow = {
  id: string;
  start_date: string;
  end_date: string;
  country_code: string;
  country_name: string;
  cities: string;
  notes: string | null;
};

export function mapLocationRow(row: LocationPointRow): LocationPoint {
  return {
    id: row.id,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    altitude: row.altitude ?? undefined,
    speed: row.speed ?? undefined,
    heading: row.heading ?? undefined,
    timezone: row.timezone ?? undefined,
    countryCode: row.country_code ?? undefined,
    countryName: row.country_name ?? undefined,
    region: row.region ?? undefined,
    city: row.city ?? undefined,
    source: row.source,
    reverseGeocodeStatus: row.reverse_geocode_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
