import * as Network from "expo-network";
import { create } from "zustand";
import {
  defaultSettings,
  insertManualTravelEntry,
  readDashboardSummary,
  readDayRecordsForDashboardYear,
  readDayRecordsForMonth,
  readLocationPointsForDashboardYear,
  readSettings,
  readTrips,
  writeSetting
} from "../db/database";
import { processGeocodeQueue } from "../services/geocoding/geocodeQueue";
import type { AppSettings, DashboardSummary, LocationPoint, Trip } from "../types/models";

export type DayRecordPreview = {
  date: string;
  primary_country_code: string | null;
  primary_country_name: string | null;
  is_travel_day: number;
  is_pending_validation: number;
  is_manual_override: number;
};

type AppState = {
  isReady: boolean;
  isOffline: boolean;
  settings: AppSettings;
  summary: DashboardSummary;
  selectedDate: string;
  mapPoints: LocationPoint[];
  trips: Trip[];
  monthRecords: DayRecordPreview[];
  yearRecords: DayRecordPreview[];
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  addManualEntry: (entry: { startDate: string; endDate: string; countryCode: string; countryName: string }) => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  runGeocodeQueue: () => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);
const STARTUP_TIMEOUT_MS = 5000;

async function withTimeout<T>(label: string, promise: Promise<T>, timeoutMs = STARTUP_TIMEOUT_MS): Promise<T> {
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

async function readNetworkOfflineState() {
  try {
    const network = await withTimeout("Network state", Network.getNetworkStateAsync(), 2500);
    return !network.isInternetReachable;
  } catch (error) {
    console.warn(`[startup] Network state unavailable: ${getErrorMessage(error)}`);
    return false;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  isOffline: false,
  settings: defaultSettings,
  summary: {
    indiaDays: 0,
    outsideIndiaDays: 0,
    countryTotals: [],
    pendingValidationCount: 0
  },
  selectedDate: today,
  mapPoints: [],
  trips: [],
  monthRecords: [],
  yearRecords: [],
  initialize: async () => {
    try {
      const settings = await withTimeout("Settings load", readSettings());
      const isOffline = await readNetworkOfflineState();
      set({ settings, isOffline });
      await withTimeout("Initial refresh", get().refresh());
    } catch (error) {
      console.error(`[startup] Initialization failed: ${getErrorMessage(error)}`);
      set({ settings: defaultSettings, isOffline: false });
    } finally {
      set({ isReady: true });
    }
  },
  refresh: async () => {
    const [summary, mapPoints, trips, monthRecords, yearRecords] = await Promise.all([
      readDashboardSummary(),
      readLocationPointsForDashboardYear(),
      readTrips(),
      readDayRecordsForMonth(get().selectedDate),
      readDayRecordsForDashboardYear()
    ]);
    const isOffline = await readNetworkOfflineState();
    set({
      summary,
      mapPoints,
      trips,
      monthRecords: monthRecords as DayRecordPreview[],
      yearRecords: yearRecords as DayRecordPreview[],
      isOffline
    });
  },
  setSelectedDate: async (date) => {
    set({ selectedDate: date });
    const [mapPoints, monthRecords] = await Promise.all([readLocationPointsForDashboardYear(), readDayRecordsForMonth(date)]);
    set({ mapPoints, monthRecords: monthRecords as DayRecordPreview[] });
  },
  addManualEntry: async (entry) => {
    await insertManualTravelEntry(entry);
    set({ selectedDate: entry.startDate });
    await get().refresh();
  },
  updateSetting: async (key, value) => {
    await writeSetting(key, value);
    set({ settings: { ...get().settings, [key]: value } });
  },
  runGeocodeQueue: async () => {
    try {
      await processGeocodeQueue();
      await get().refresh();
    } catch (error) {
      console.warn(`[geocode] Queue failed: ${getErrorMessage(error)}`);
    }
  }
}));
