import * as SQLite from "expo-sqlite";
import { migrations } from "./migrations";
import { uuid } from "../lib/utils";
import { getResidencyYearWindow } from "../services/calculations/residencyYear";
import type { AppSettings, DashboardSummary, LocationPoint, PendingGeocodeJob, Trip } from "../types/models";

let dbPromise: Promise<SQLite.SQLiteDatabase> | undefined;
const currentYear = new Date().getUTCFullYear();
const maxManualEntryDays = 3660;

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
  wifiOnlyBackup: true,
  appearance: "system",
  cloudBackupEnabled: true,
  onboardingCompleted: false
};

export async function getDb() {
  dbPromise ??= openConfiguredDatabase();
  return dbPromise;
}

async function openConfiguredDatabase() {
  const db = await SQLite.openDatabaseAsync("travel-nri-tracker.db");
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await migrate(db);
  return db;
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
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
    String(key),
    JSON.stringify(value),
    new Date().toISOString()
  );
}

export async function insertLocationPoint(point: Omit<LocationPoint, "createdAt" | "updatedAt">) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO location_points (
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
}

export async function enqueueGeocodeJob(point: Pick<LocationPoint, "id" | "latitude" | "longitude" | "timestamp">) {
  const db = await getDb();
  const now = new Date().toISOString();
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
}

export async function getPendingGeocodeJobs(limit = 25) {
  const db = await getDb();
  return db.getAllAsync<PendingGeocodeJobRow>(
    `SELECT * FROM pending_geocode_jobs
     WHERE status IN ('pending', 'failed')
     ORDER BY retry_count ASC, timestamp ASC
     LIMIT ?`,
    limit
  );
}

export async function updateGeocodeJob(id: string, status: string, retryCount: number, error?: string) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE pending_geocode_jobs SET status = ?, retry_count = ?, last_attempt_at = ?, error = ?, updated_at = ? WHERE id = ?",
    status,
    retryCount,
    new Date().toISOString(),
    error ?? null,
    new Date().toISOString(),
    id
  );
}

export async function updateLocationGeocode(
  id: string,
  result: Pick<LocationPoint, "countryCode" | "countryName" | "region" | "city" | "timezone">
) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE location_points SET
      country_code = ?, country_name = ?, region = ?, city = ?, timezone = ?,
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
    "SELECT COUNT(*) as count FROM pending_geocode_jobs WHERE status IN ('pending', 'failed')"
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
  const db = await getDb();
  const now = new Date().toISOString();
  const tripId = uuid("trip");
  const dates = enumerateIsoDates(entry.startDate, entry.endDate);

  await db.withTransactionAsync(async () => {
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
  created_at: string;
  updated_at: string;
};

type DayRecordRow = {
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
