import type { AppSettings, DashboardSummary, LocationPoint, PendingGeocodeJob, Trip } from "../types/models";
import { uuid } from "../lib/utils";
import { getResidencyYearWindow } from "../services/calculations/residencyYear";

const SETTINGS_KEY = "travel-nri-tracker.settings";
const POINTS_KEY = "travel-nri-tracker.locationPoints";
const DAY_RECORDS_KEY = "travel-nri-tracker.dayRecords";
const TRIPS_KEY = "travel-nri-tracker.trips";
const currentYear = new Date().getUTCFullYear();
const maxManualEntryDays = 3660;
const manualTripNotes = new Set(["Manual history entry", "Manual day correction"]);

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
  return {
    execAsync: async () => undefined,
    runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
    getAllAsync: async () => [],
    getFirstAsync: async () => null,
    withTransactionAsync: async (callback: () => Promise<void>) => callback()
  };
}

export async function runDbWriteTransaction(callback: (db: Awaited<ReturnType<typeof getDb>>) => Promise<void>) {
  const db = await getDb();
  await callback(db);
}

export async function readSettings(): Promise<AppSettings> {
  const raw = globalThis.localStorage?.getItem(SETTINGS_KEY);
  return raw ? { ...defaultSettings, ...(JSON.parse(raw) as Partial<AppSettings>) } : defaultSettings;
}

export async function writeSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  const settings = await readSettings();
  const next = { ...settings, [key]: value };
  globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export async function hasLocalTravelData() {
  return readStoredPoints().length > 0 || readStoredDayRecords().length > 0 || readStoredTrips().length > 0;
}

export async function clearAllLocalData() {
  globalThis.localStorage?.removeItem(SETTINGS_KEY);
  globalThis.localStorage?.removeItem(POINTS_KEY);
  globalThis.localStorage?.removeItem(DAY_RECORDS_KEY);
  globalThis.localStorage?.removeItem(TRIPS_KEY);
}

export async function insertLocationPoint(point: Omit<LocationPoint, "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const date = point.timestamp.slice(0, 10);
  const points = readStoredPoints().filter((existing) => existing.timestamp.slice(0, 10) !== date);
  points.push({ ...point, createdAt: now, updatedAt: now });
  globalThis.localStorage?.setItem(POINTS_KEY, JSON.stringify(points));
}

export async function enqueueGeocodeJob() {
  return undefined;
}

export async function getPendingGeocodeJobs(): Promise<PendingGeocodeJob[]> {
  return [];
}

export async function updateGeocodeJob() {
  return undefined;
}

export async function updateLocationGeocode() {
  return undefined;
}

export async function readDashboardSummary(): Promise<DashboardSummary> {
  const settings = await readSettings();
  const window = getResidencyYearWindow(settings, currentYear);
  const points = readStoredPoints();
  const currentLocation = [...points].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  const manualRecords = readStoredDayRecords().filter((record) => record.date >= window.startDate && record.date <= window.endDate);
  const pointsInYear = points.filter((point) => {
    const date = point.timestamp.slice(0, 10);
    return date >= window.startDate && date <= window.endDate;
  });
  const countryMap = new Map<string, { countryCode: string; countryName: string; days: number }>();

  for (const record of manualRecords) {
    if (!record.primary_country_code || !record.primary_country_name) continue;
    const existing = countryMap.get(record.primary_country_code) ?? {
      countryCode: record.primary_country_code,
      countryName: record.primary_country_name,
      days: 0
    };
    existing.days += 1;
    countryMap.set(record.primary_country_code, existing);
  }

  for (const point of pointsInYear) {
    const date = point.timestamp.slice(0, 10);
    if (manualRecords.some((record) => record.date === date) || !point.countryCode || !point.countryName) continue;
    const existing = countryMap.get(point.countryCode) ?? {
      countryCode: point.countryCode,
      countryName: point.countryName,
      days: 0
    };
    existing.days += 1;
    countryMap.set(point.countryCode, existing);
  }

  const countryTotals = [...countryMap.values()];
  return {
    currentLocation,
    indiaDays: countryTotals.find((row) => row.countryCode === "IN")?.days ?? 0,
    outsideIndiaDays: countryTotals.filter((row) => row.countryCode !== "IN").reduce((sum, row) => sum + row.days, 0),
    countryTotals,
    pendingValidationCount: 0
  };
}

export async function readLocationPointsForDate(date: string) {
  return readStoredPoints().filter((point) => point.timestamp.startsWith(date));
}

export async function readLocationPointsForDashboardYear() {
  const settings = await readSettings();
  const window = getResidencyYearWindow(settings, currentYear);
  const latestByDate = new Map<string, LocationPoint>();
  for (const point of readStoredPoints()) {
    const date = point.timestamp.slice(0, 10);
    if (date < window.startDate || date > window.endDate) continue;
    const existing = latestByDate.get(date);
    if (!existing || point.timestamp > existing.timestamp) {
      latestByDate.set(date, point);
    }
  }
  return [...latestByDate.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function readDayRecordsForDashboardYear() {
  const settings = await readSettings();
  const window = getResidencyYearWindow(settings, currentYear);
  return readDayRecordsForDateRange(window.startDate, window.endDate);
}

export async function readDayRecordsForDateRange(startDate: string, endDate: string) {
  const records = readStoredDayRecords().filter((record) => record.date >= startDate && record.date <= endDate);
  const recordedDates = new Set(records.map((record) => record.date));
  const latestPointsByDate = new Map<string, LocationPoint>();

  for (const point of readStoredPoints()) {
    const date = point.timestamp.slice(0, 10);
    if (date < startDate || date > endDate || recordedDates.has(date)) continue;

    const existing = latestPointsByDate.get(date);
    if (!existing || point.timestamp > existing.timestamp) {
      latestPointsByDate.set(date, point);
    }
  }

  for (const [date, point] of latestPointsByDate) {
    records.push({
      date,
      primary_country_code: point.countryCode ?? null,
      primary_country_name: point.countryName ?? null,
      countries_visited: JSON.stringify(point.countryCode ? [point.countryCode] : []),
      is_travel_day: 0,
      is_pending_validation: point.reverseGeocodeStatus === "done" ? 0 : 1,
      is_manual_override: 0,
      notes: null
    });
  }

  return records.sort((a, b) => a.date.localeCompare(b.date));
}

export async function readTrips(): Promise<Trip[]> {
  return readStoredTrips().sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function insertManualTravelEntry(entry: {
  startDate: string;
  endDate: string;
  countryCode: string;
  countryName: string;
}) {
  const trip: Trip = {
    id: uuid("trip"),
    startDate: entry.startDate,
    endDate: entry.endDate,
    countryCode: entry.countryCode,
    countryName: entry.countryName,
    cities: [],
    notes: "Manual history entry"
  };
  const trips = readStoredTrips().filter((existing) => existing.id !== trip.id);
  trips.push(trip);
  globalThis.localStorage?.setItem(TRIPS_KEY, JSON.stringify(trips));

  const records = readStoredDayRecords().filter((record) => record.date < entry.startDate || record.date > entry.endDate);
  for (const date of enumerateIsoDates(entry.startDate, entry.endDate)) {
    records.push({
      date,
      primary_country_code: entry.countryCode,
      primary_country_name: entry.countryName,
      countries_visited: JSON.stringify([entry.countryCode]),
      is_travel_day: 0,
      is_pending_validation: 0,
      is_manual_override: 1,
      notes: "Manual history entry"
    });
  }
  globalThis.localStorage?.setItem(DAY_RECORDS_KEY, JSON.stringify(records));

  return trip.id;
}

export async function updateManualDayEntry(entry: {
  originalDate: string;
  date: string;
  countryCode: string;
  countryName: string;
}) {
  const affectedDates = entry.originalDate === entry.date ? [entry.date] : [entry.originalDate, entry.date];
  let trips = readStoredTrips();

  for (const date of affectedDates) {
    trips = removeManualTripsForDate(trips, date);
  }

  trips.push({
    id: uuid("trip"),
    startDate: entry.date,
    endDate: entry.date,
    countryCode: entry.countryCode,
    countryName: entry.countryName,
    cities: [],
    notes: "Manual day correction"
  });
  globalThis.localStorage?.setItem(TRIPS_KEY, JSON.stringify(trips));

  let records = readStoredDayRecords();
  if (entry.originalDate !== entry.date) {
    records = records.filter((record) => record.date !== entry.originalDate || record.is_manual_override !== 1);
  }

  records = records.filter((record) => record.date !== entry.date);
  records.push({
    date: entry.date,
    primary_country_code: entry.countryCode,
    primary_country_name: entry.countryName,
    countries_visited: JSON.stringify([entry.countryCode]),
    is_travel_day: 0,
    is_pending_validation: 0,
    is_manual_override: 1,
    notes: "Manual day correction"
  });
  globalThis.localStorage?.setItem(DAY_RECORDS_KEY, JSON.stringify(records));
}

export async function readDayRecordsForMonth(monthStartIso: string) {
  const start = monthStartIso.slice(0, 8) + "01";
  const end = new Date(`${start}T00:00:00.000Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const endIso = end.toISOString().slice(0, 10);
  return readStoredDayRecords()
    .filter((record) => record.date >= start && record.date < endIso)
    .sort((a, b) => a.date.localeCompare(b.date));
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

function readStoredPoints(): LocationPoint[] {
  const raw = globalThis.localStorage?.getItem(POINTS_KEY);
  return raw ? (JSON.parse(raw) as LocationPoint[]) : [];
}

type StoredDayRecord = {
  date: string;
  primary_country_code: string | null;
  primary_country_name: string | null;
  countries_visited: string;
  is_travel_day: number;
  is_pending_validation: number;
  is_manual_override: number;
  notes: string | null;
};

function readStoredDayRecords(): StoredDayRecord[] {
  const raw = globalThis.localStorage?.getItem(DAY_RECORDS_KEY);
  return raw ? (JSON.parse(raw) as StoredDayRecord[]) : [];
}

function readStoredTrips(): Trip[] {
  const raw = globalThis.localStorage?.getItem(TRIPS_KEY);
  return raw ? (JSON.parse(raw) as Trip[]) : [];
}

function removeManualTripsForDate(trips: Trip[], date: string) {
  const nextTrips: Trip[] = [];

  for (const trip of trips) {
    if (trip.startDate > date || trip.endDate < date || !manualTripNotes.has(trip.notes ?? "")) {
      nextTrips.push(trip);
      continue;
    }

    if (trip.startDate < date) {
      nextTrips.push({
        ...trip,
        endDate: addIsoDays(date, -1)
      });
    }

    if (trip.endDate > date) {
      nextTrips.push({
        ...trip,
        id: uuid("trip"),
        startDate: addIsoDays(date, 1)
      });
    }
  }

  return nextTrips;
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
