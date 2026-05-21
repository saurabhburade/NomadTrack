export type LocationSource = "gps" | "gps_offline" | "manual" | "photo" | "import";
export type ReverseGeocodeStatus = "pending" | "done" | "failed";
export type GeocodeJobStatus = "pending" | "processing" | "done" | "failed";
export type TrackingIntervalHours = 1 | 2 | 4 | 8 | "manual";
export type DayCountingRule = "departure" | "arrival" | "longest_duration" | "manual";

export type LocationPoint = {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timezone?: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  city?: string;
  source: LocationSource;
  reverseGeocodeStatus: ReverseGeocodeStatus;
  createdAt: string;
  updatedAt: string;
};

export type DayCountrySegment = {
  id: string;
  date: string;
  countryCode?: string;
  countryName?: string;
  startTime: string;
  endTime: string;
  source: LocationSource;
  confidence: number;
  isPendingValidation: boolean;
};

export type DayRecord = {
  date: string;
  primaryCountryCode?: string;
  primaryCountryName?: string;
  countriesVisited: string[];
  segments: DayCountrySegment[];
  isTravelDay: boolean;
  isPendingValidation: boolean;
  isManualOverride: boolean;
  notes?: string;
};

export type Trip = {
  id: string;
  startDate: string;
  endDate: string;
  countryCode: string;
  countryName: string;
  cities: string[];
  notes?: string;
};

export type PendingGeocodeJob = {
  id: string;
  locationPointId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: GeocodeJobStatus;
  retryCount: number;
  lastAttemptAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type BackupMetadata = {
  id: string;
  backupVersion: number;
  checksum: string;
  lastBackupAt: string;
  driveFileId?: string;
};

export type AppSettings = {
  trackingInterval: TrackingIntervalHours;
  batterySaver: boolean;
  trackingPaused: boolean;
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  residencyYearEnd: number;
  calendarYearMode: boolean;
  dayCountingRule: DayCountingRule;
  autoBackup: boolean;
  wifiOnlyBackup: boolean;
  appearance: "system" | "light" | "dark";
  cloudBackupEnabled: boolean;
  onboardingCompleted: boolean;
};

export type DashboardSummary = {
  currentLocation?: LocationPoint;
  indiaDays: number;
  outsideIndiaDays: number;
  countryTotals: Array<{ countryCode: string; countryName: string; days: number }>;
  pendingValidationCount: number;
  lastSyncedAt?: string;
};
