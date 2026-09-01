import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";
import { getDb, readSettings, runDbWriteTransaction } from "../../db/database";
import { uuid } from "../../lib/utils";
import { assertGoogleAccessToken, GoogleLoginRequiredError, getGoogleAccessToken } from "../auth/googleAuth";
import { showStatusNotification } from "../notifications/statusNotifications";
import { localArtifactNames } from "../privacy/localArtifacts";

const driveFilesUrl = "https://www.googleapis.com/drive/v3/files";
const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files";
const driveRootFolderName = "NomadTrack";
const driveBackupFolderName = "all-data";
const backupFileName = "travel-nri-tracker-backup.json";
const maxBackupDownloadBytes = 30 * 1024 * 1024;
const maxRowsPerTable: Record<BackupTable, number> = {
  location_points: 250_000,
  day_records: 20_000,
  day_country_segments: 100_000,
  trips: 20_000,
  pending_geocode_jobs: 250_000,
  settings: 32
};
const maxTotalRestoreRows = 500_000;
const autoBackupIntervalsMs = {
  "1m": 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
} as const;

let autoBackupPromise: Promise<AutoBackupResult> | undefined;

type BackupPayload = {
  backupVersion: 1;
  createdAt: string;
  scope: {
    kind?: "all" | "date_range";
    label: string;
    startDate: string;
    endDate: string;
  };
  checksum: string;
  data: Record<string, unknown[]>;
};
type BackupHeader = Omit<BackupPayload, "data">;
export type DriveBackupFile = {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  year?: string;
};
export type AutoBackupResult =
  | { status: "uploaded"; modifiedTime: string }
  | { status: "skipped"; reason: "disabled" | "no_google" | "offline" | "wifi_only" | "not_due" | "empty" | "busy" }
  | { status: "failed"; error: Error };
export type BackupProgressItem = {
  id: string;
  label: string;
  status: "pending" | "active" | "complete";
};
export type BackupProgress = {
  title: string;
  message: string;
  items: BackupProgressItem[];
};
type BackupProgressOptions = {
  onProgress?: (progress: BackupProgress) => void;
};

type BackupTable = "location_points" | "day_records" | "day_country_segments" | "trips" | "pending_geocode_jobs" | "settings";

const restoreTables: Record<BackupTable, readonly string[]> = {
  location_points: [
    "id",
    "timestamp",
    "latitude",
    "longitude",
    "accuracy",
    "altitude",
    "speed",
    "heading",
    "timezone",
    "country_code",
    "country_name",
    "region",
    "city",
    "source",
    "reverse_geocode_status",
    "created_at",
    "updated_at"
  ],
  day_records: [
    "date",
    "primary_country_code",
    "primary_country_name",
    "countries_visited",
    "is_travel_day",
    "is_pending_validation",
    "is_manual_override",
    "notes",
    "created_at",
    "updated_at"
  ],
  day_country_segments: [
    "id",
    "date",
    "country_code",
    "country_name",
    "start_time",
    "end_time",
    "source",
    "confidence",
    "is_pending_validation",
    "created_at",
    "updated_at"
  ],
  trips: ["id", "start_date", "end_date", "country_code", "country_name", "cities", "notes", "is_ghost", "created_at", "updated_at"],
  pending_geocode_jobs: [
    "id",
    "location_point_id",
    "latitude",
    "longitude",
    "timestamp",
    "status",
    "retry_count",
    "last_attempt_at",
    "error",
    "created_at",
    "updated_at"
  ],
  settings: ["key", "value", "updated_at"]
};

export async function createJsonBackup(options: BackupProgressOptions = {}): Promise<BackupPayload> {
  const { serializedBackup } = await createSerializedJsonBackup(options);
  return JSON.parse(serializedBackup) as BackupPayload;
}

async function createSerializedJsonBackup(options: BackupProgressOptions = {}): Promise<{ header: BackupHeader; serializedBackup: string }> {
  const db = await getDb();
  const scope = await getBackupScope();
  const createdAt = new Date().toISOString();
  const years = await readBackupYears();
  const yearItems = createYearProgressItems("backup", years);
  emitProgress(options, "Backing Up", "Preparing travel history backup.", yearItems);
  await runProgressItems(options, "Backing Up", yearItems);
  const data: Record<string, unknown[]> = {
    location_points: await db.getAllAsync("SELECT * FROM location_points ORDER BY timestamp ASC"),
    day_records: await db.getAllAsync("SELECT * FROM day_records ORDER BY date ASC"),
    day_country_segments: await db.getAllAsync("SELECT * FROM day_country_segments ORDER BY date ASC, start_time ASC"),
    trips: await db.getAllAsync("SELECT * FROM trips ORDER BY start_date ASC"),
    pending_geocode_jobs: await db.getAllAsync("SELECT * FROM pending_geocode_jobs ORDER BY timestamp ASC"),
    backup_metadata: [],
    settings: await db.getAllAsync("SELECT * FROM settings")
  };
  const serializedData = JSON.stringify(data);
  const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, serializedData);
  const header: BackupHeader = {
    backupVersion: 1,
    createdAt,
    scope,
    checksum
  };
  const serializedBackup = `{"backupVersion":1,"createdAt":${JSON.stringify(createdAt)},"scope":${JSON.stringify(scope)},"checksum":${JSON.stringify(checksum)},"data":${serializedData}}`;
  emitProgress(options, "Backing Up", "Travel history is ready to upload.", completeProgressItems(yearItems));

  return { header, serializedBackup };
}

export async function writeLocalBackupFile(options: BackupProgressOptions = {}) {
  const { header, serializedBackup } = await createSerializedJsonBackup(options);
  const path = `${FileSystem.documentDirectory}${localArtifactNames.backup(header.createdAt.slice(0, 10))}`;
  const fileItems = [{ id: "local-file", label: "Writing local backup file", status: "active" as const }];
  emitProgress(options, "Backing Up", "Saving local backup file.", fileItems);
  await FileSystem.writeAsStringAsync(path, serializedBackup);
  emitProgress(options, "Backing Up", "Local backup file saved.", completeProgressItems(fileItems));
  return path;
}

export async function uploadBackupToDrive(options: BackupProgressOptions = {}) {
  const accessToken = await getGoogleAccessToken();
  assertGoogleAccessToken(accessToken);
  await showStatusNotification("Taking backup", "Uploading your latest travel backup to Google Drive.", { identifier: "nomadtrack-status-backup" });
  const { header, serializedBackup } = await createSerializedJsonBackup(options);
  const folderId = await getOrCreateDriveBackupFolder(accessToken);
  const existingBackup = await findDriveBackupFile(accessToken, folderId);
  const uploadItems = [{ id: "drive-file", label: "Uploading Google Drive backup file", status: "active" as const }];
  emitProgress(options, "Backing Up", existingBackup ? "Updating existing Google Drive backup file." : "Creating Google Drive backup file.", uploadItems);
  const metadata = {
    name: backupFileName,
    ...(existingBackup ? {} : { parents: [folderId] }),
    mimeType: "application/json"
  };
  const boundary = `travel_nri_${Date.now()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    serializedBackup,
    `--${boundary}--`
  ].join("\r\n");

  const targetUrl = existingBackup
    ? `${uploadUrl}/${existingBackup.id}?uploadType=multipart&fields=id,name,modifiedTime`
    : `${uploadUrl}?uploadType=multipart&fields=id,name,modifiedTime`;
  const response = await fetch(targetUrl, {
    method: existingBackup ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });
  if (!response.ok) throw await driveError("Drive backup failed", response);
  const result = (await response.json()) as { id: string; name: string; modifiedTime: string };
  emitProgress(options, "Backing Up", "Google Drive backup uploaded.", completeProgressItems(uploadItems));
  const now = new Date().toISOString();
  await runDbWriteTransaction(async (db) => {
    await db.runAsync(
      `INSERT INTO backup_metadata (id, backup_version, checksum, last_backup_at, drive_file_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uuid("backup"),
      header.backupVersion,
      header.checksum,
      result.modifiedTime ?? now,
      result.id,
      now,
      now
    );
  });
  return result;
}

export async function runAutoBackupIfDue(): Promise<AutoBackupResult> {
  if (autoBackupPromise) return { status: "skipped", reason: "busy" };

  autoBackupPromise = runAutoBackupIfDueOnce().finally(() => {
    autoBackupPromise = undefined;
  });
  return autoBackupPromise;
}

async function runAutoBackupIfDueOnce(): Promise<AutoBackupResult> {
  try {
    const settings = await readSettings();
    if (!settings.cloudBackupEnabled || !settings.autoBackup) return { status: "skipped", reason: "disabled" };

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) return { status: "skipped", reason: "no_google" };

    const network = await Network.getNetworkStateAsync();
    if (!network.isInternetReachable) return { status: "skipped", reason: "offline" };
    if (settings.wifiOnlyBackup && network.type !== Network.NetworkStateType.WIFI) {
      return { status: "skipped", reason: "wifi_only" };
    }

    const latestBackup = await readLatestBackupTime();
    const intervalMs = autoBackupIntervalsMs[settings.autoBackupFrequency];
    if (latestBackup && Date.now() - new Date(latestBackup).getTime() < intervalMs) {
      return { status: "skipped", reason: "not_due" };
    }

    const travelRows = await countBackupTravelRows();
    if (travelRows === 0) return { status: "skipped", reason: "empty" };

    const result = await uploadBackupToDrive();
    return { status: "uploaded", modifiedTime: result.modifiedTime };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export async function listDriveBackups() {
  const accessToken = await getGoogleAccessToken();
  assertGoogleAccessToken(accessToken);
  return listDriveBackupsWithToken(accessToken);
}

export async function restoreLatestDriveBackup(options: BackupProgressOptions = {}) {
  const accessToken = await getGoogleAccessToken();
  assertGoogleAccessToken(accessToken);
  emitProgress(options, "Restoring", "Checking Google Drive backup files.", [
    { id: "list-drive", label: "Checking Google Drive backup files", status: "active" }
  ]);
  const backupFiles = await listDriveBackupsWithToken(accessToken);
  const sortedFiles = backupFiles.files.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
  if (!sortedFiles.length) throw new Error("No Drive backup found to restore.");

  let settingsOnlyBackup: { file: DriveBackupFile; payload: BackupPayload; counts: Record<BackupTable, number>; displayDate: string } | undefined;
  let lastError: unknown;
  for (const file of sortedFiles) {
    try {
      const fileItem = { id: `download-${file.id}`, label: `Downloading ${file.year ?? file.name} backup file`, status: "active" as const };
      emitProgress(options, "Restoring", "Downloading Google Drive backup file.", [fileItem]);
      const payload = await downloadAndValidateDriveBackup(accessToken, file);
      emitProgress(options, "Restoring", "Google Drive backup file downloaded.", completeProgressItems([fileItem]));
      const counts = countBackupRows(payload);
      const displayDate = getRestoreDisplayDate(payload);
      if (countTravelRows(counts) > 0) {
        await restoreBackupPayload(payload, file, options);
        return { file, backup: payload, restoredRows: counts, displayDate };
      }
      settingsOnlyBackup ??= { file, payload, counts, displayDate };
    } catch (error) {
      lastError = error;
    }
  }

  if (settingsOnlyBackup) {
    await restoreBackupPayload(settingsOnlyBackup.payload, settingsOnlyBackup.file, options);
    return {
      file: settingsOnlyBackup.file,
      backup: settingsOnlyBackup.payload,
      restoredRows: settingsOnlyBackup.counts,
      displayDate: settingsOnlyBackup.displayDate
    };
  }

  throw lastError instanceof Error ? lastError : new Error("No readable Drive backup found to restore.");
}

async function listDriveBackupsWithToken(accessToken: string) {
  const rootFolder = await findDriveFolder(accessToken, driveRootFolderName);
  if (!rootFolder) return { files: [] as DriveBackupFile[] };

  const folders = await listDriveFolders(accessToken, rootFolder.id);
  const files: DriveBackupFile[] = [];
  for (const folder of folders) {
    files.push(...(await listDriveBackupFilesInFolder(accessToken, folder.id, folder.name)));
  }

  return { files };
}

async function listDriveBackupFilesInFolder(accessToken: string, folderId: string, year?: string) {
  const query = encodeURIComponent(`name = '${escapeDriveQueryValue(backupFileName)}' and '${folderId}' in parents and trashed = false`);
  const response = await fetch(`${driveFilesUrl}?spaces=drive&q=${query}&fields=files(id,name,modifiedTime,size,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw await driveError("Drive list failed", response);
  const result = (await response.json()) as { files: DriveBackupFile[] };
  return result.files.map((file) => ({ ...file, year }));
}

async function getBackupScope() {
  return {
    kind: "all" as const,
    label: "all entries",
    startDate: "0000-01-01",
    endDate: "9999-12-31"
  };
}

async function readLatestBackupTime() {
  const db = await getDb();
  const latest = await db.getFirstAsync<{ lastBackupAt: string }>(
    "SELECT last_backup_at as lastBackupAt FROM backup_metadata ORDER BY last_backup_at DESC LIMIT 1"
  );
  return latest?.lastBackupAt;
}

async function readBackupYears() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ year: string }>(
    `SELECT year FROM (
       SELECT substr(timestamp, 1, 4) as year FROM location_points
       UNION
       SELECT substr(date, 1, 4) as year FROM day_records
       UNION
       SELECT substr(date, 1, 4) as year FROM day_country_segments
       UNION
       SELECT substr(start_date, 1, 4) as year FROM trips
       UNION
       SELECT substr(timestamp, 1, 4) as year FROM pending_geocode_jobs
     )
     WHERE year GLOB '[0-9][0-9][0-9][0-9]'
     ORDER BY year ASC`
  );
  return rows.map((row) => row.year);
}

async function countBackupTravelRows() {
  const db = await getDb();
  const locationPoints = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM location_points");
  const dayRecords = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM day_records");
  const trips = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM trips");

  return (locationPoints?.count ?? 0) + (dayRecords?.count ?? 0) + (trips?.count ?? 0);
}

async function getOrCreateDriveBackupFolder(accessToken: string) {
  const rootFolderId = await getOrCreateDriveFolder(accessToken, driveRootFolderName);
  return getOrCreateDriveFolder(accessToken, driveBackupFolderName, rootFolderId);
}

async function getOrCreateDriveFolder(accessToken: string, folderName: string, parentId?: string) {
  const existing = await findDriveFolder(accessToken, folderName, parentId);
  if (existing) return existing.id;

  const response = await fetch(`${driveFilesUrl}?fields=id,name`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {})
    })
  });
  if (!response.ok) throw await driveError("Drive folder create failed", response);
  const folder = (await response.json()) as { id: string; name: string };
  return folder.id;
}

async function listDriveFolders(accessToken: string, parentId: string) {
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`);
  const response = await fetch(`${driveFilesUrl}?spaces=drive&q=${query}&fields=files(id,name)&pageSize=100`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw await driveError("Drive folder list failed", response);
  const result = (await response.json()) as { files: Array<{ id: string; name: string }> };
  return result.files;
}

async function findDriveFolder(accessToken: string, folderName: string, parentId?: string) {
  const parentQuery = parentId ? ` and '${parentId}' in parents` : "";
  const query = encodeURIComponent(
    `name = '${escapeDriveQueryValue(folderName)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentQuery}`
  );
  const response = await fetch(`${driveFilesUrl}?spaces=drive&q=${query}&fields=files(id,name)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw await driveError("Drive folder lookup failed", response);
  const result = (await response.json()) as { files: Array<{ id: string; name: string }> };
  return result.files[0];
}

async function findDriveBackupFile(accessToken: string, folderId: string) {
  const query = encodeURIComponent(`name = '${escapeDriveQueryValue(backupFileName)}' and '${folderId}' in parents and trashed = false`);
  const response = await fetch(`${driveFilesUrl}?spaces=drive&q=${query}&fields=files(id,name,modifiedTime)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw await driveError("Drive backup lookup failed", response);
  const result = (await response.json()) as { files: Array<{ id: string; name: string; modifiedTime: string }> };
  return result.files[0];
}

async function parseAndValidateBackup(rawBackup: string): Promise<BackupPayload> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBackup);
  } catch {
    throw new Error("Downloaded backup is not valid JSON.");
  }

  if (!isBackupPayload(parsed)) {
    throw new Error("Downloaded backup is not a supported NomadTrack backup.");
  }

  // This unkeyed digest detects accidental corruption only; it does not authenticate a backup.
  const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(parsed.data));
  if (checksum !== parsed.checksum) {
    throw new Error("Backup checksum did not match. Restore was cancelled.");
  }

  return parsed;
}

async function downloadAndValidateDriveBackup(accessToken: string, file: DriveBackupFile) {
  const advertisedSize = Number(file.size);
  if (Number.isFinite(advertisedSize) && advertisedSize > maxBackupDownloadBytes) {
    throw new Error("Backup is too large to restore safely.");
  }
  const response = await fetch(`${driveFilesUrl}/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw await driveError("Drive backup download failed", response);
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBackupDownloadBytes) {
    throw new Error("Backup is too large to restore safely.");
  }
  const rawBackup = await response.text();
  if (new TextEncoder().encode(rawBackup).byteLength > maxBackupDownloadBytes) throw new Error("Backup is too large to restore safely.");
  return parseAndValidateBackup(rawBackup);
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!isRecord(value)) return false;
  if (value.backupVersion !== 1 || !isIsoTimestamp(value.createdAt) || typeof value.checksum !== "string" || !/^[a-f0-9]{64}$/i.test(value.checksum))
    return false;
  if (!isRecord(value.scope)) return false;
  if (!isText(value.scope.label, 256) || !isText(value.scope.startDate, 32) || !isText(value.scope.endDate, 32)) return false;
  if (value.scope.kind !== undefined && value.scope.kind !== "all" && value.scope.kind !== "date_range") return false;
  if (value.scope.kind !== "all" && (!isIsoDate(value.scope.startDate) || !isIsoDate(value.scope.endDate) || value.scope.startDate > value.scope.endDate))
    return false;
  if (!isRecord(value.data)) return false;
  const data = value.data;

  if (
    !(Object.keys(restoreTables) as BackupTable[]).every((table) => {
      const rows = data[table];
      return rows === undefined || Array.isArray(rows);
    })
  )
    return false;

  let totalRows = 0;
  for (const table of Object.keys(restoreTables) as BackupTable[]) {
    const rows = data[table] as unknown[] | undefined;
    if (!rows) continue;
    if (rows.length > maxRowsPerTable[table]) return false;
    totalRows += rows.length;
    if (!rows.every((row) => isValidBackupRow(table, row))) return false;
  }
  return totalRows <= maxTotalRestoreRows;
}

const locationSources = new Set([
  "gps",
  "gps_offline",
  "manual",
  "photo",
  "import",
  "visit",
  "slc",
  "region-exit",
  "region-enter",
  "shortcuts",
  "charger-connected"
]);
const reverseGeocodeStatuses = new Set(["pending", "done", "failed"]);
const geocodeJobStatuses = new Set(["pending", "processing", "done", "failed"]);
const settingValidators: Record<string, (value: unknown) => boolean> = {
  trackingInterval: (value) => value === "1m" || value === "manual" || [1, 2, 4, 8].includes(value as number),
  batterySaver: isBoolean,
  trackingPaused: isBoolean,
  fiscalYearStartMonth: (value) => isIntegerInRange(value, 1, 12),
  fiscalYearStartDay: (value) => isIntegerInRange(value, 1, 31),
  residencyYearEnd: (value) => isIntegerInRange(value, 1900, 3000),
  calendarYearMode: isBoolean,
  dayCountingRule: (value) => value === "departure" || value === "arrival" || value === "longest_duration" || value === "manual",
  autoBackup: isBoolean,
  autoBackupFrequency: (value) => value === "1m" || value === "daily" || value === "weekly" || value === "monthly",
  wifiOnlyBackup: isBoolean,
  appearance: (value) => value === "system" || value === "light" || value === "dark",
  cloudBackupEnabled: isBoolean,
  onboardingCompleted: isBoolean,
  shortcutsAutomationClaimedAt: (value) => value === undefined || isIsoTimestamp(value),
  shortcutsAutomationLastVerifiedAt: (value) => value === undefined || isIsoTimestamp(value)
};

function isValidBackupRow(table: BackupTable, value: unknown) {
  if (!isRecord(value)) return false;
  switch (table) {
    case "location_points":
      return (
        isId(value.id) &&
        isIsoTimestamp(value.timestamp) &&
        isLatitude(value.latitude) &&
        isLongitude(value.longitude) &&
        isFiniteNumberInRange(value.accuracy, 0, 1_000_000) &&
        isNullableNumberInRange(value.altitude, -20_000, 100_000) &&
        isNullableNumberInRange(value.speed, -1, 10_000) &&
        isNullableNumberInRange(value.heading, -1, 360) &&
        isNullableText(value.timezone, 128) &&
        isNullableCountryCode(value.country_code) &&
        isNullableText(value.country_name, 256) &&
        isNullableText(value.region, 256) &&
        isNullableText(value.city, 256) &&
        isEnum(value.source, locationSources) &&
        isEnum(value.reverse_geocode_status, reverseGeocodeStatuses) &&
        isIsoTimestamp(value.created_at) &&
        isIsoTimestamp(value.updated_at)
      );
    case "day_records":
      return (
        isIsoDate(value.date) &&
        isNullableCountryCode(value.primary_country_code) &&
        isNullableText(value.primary_country_name, 256) &&
        isCountryCodeArrayJson(value.countries_visited) &&
        isSqlBoolean(value.is_travel_day) &&
        isSqlBoolean(value.is_pending_validation) &&
        isSqlBoolean(value.is_manual_override) &&
        isNullableText(value.notes, 10_000) &&
        isIsoTimestamp(value.created_at) &&
        isIsoTimestamp(value.updated_at)
      );
    case "day_country_segments":
      return (
        isId(value.id) &&
        isIsoDate(value.date) &&
        isNullableCountryCode(value.country_code) &&
        isNullableText(value.country_name, 256) &&
        isIsoTimestamp(value.start_time) &&
        isIsoTimestamp(value.end_time) &&
        isEnum(value.source, locationSources) &&
        isFiniteNumberInRange(value.confidence, 0, 1) &&
        isSqlBoolean(value.is_pending_validation) &&
        isIsoTimestamp(value.created_at) &&
        isIsoTimestamp(value.updated_at) &&
        isTimestampRange(value.start_time, value.end_time)
      );
    case "trips":
      return (
        isId(value.id) &&
        isDateRange(value.start_date, value.end_date) &&
        isCountryCode(value.country_code) &&
        isText(value.country_name, 256) &&
        isStringArrayJson(value.cities, 256) &&
        isNullableText(value.notes, 10_000) &&
        isSqlBoolean(value.is_ghost) &&
        isIsoTimestamp(value.created_at) &&
        isIsoTimestamp(value.updated_at)
      );
    case "pending_geocode_jobs":
      return (
        isId(value.id) &&
        isId(value.location_point_id) &&
        isLatitude(value.latitude) &&
        isLongitude(value.longitude) &&
        isIsoTimestamp(value.timestamp) &&
        isEnum(value.status, geocodeJobStatuses) &&
        isIntegerInRange(value.retry_count, 0, 100) &&
        isNullableIsoTimestamp(value.last_attempt_at) &&
        isNullableText(value.error, 4_000) &&
        isIsoTimestamp(value.created_at) &&
        isIsoTimestamp(value.updated_at)
      );
    case "settings":
      return isValidSettingRow(value);
  }
}

function isValidSettingRow(value: Record<string, unknown>) {
  if (typeof value.key !== "string" || !Object.hasOwn(settingValidators, value.key) || !isText(value.value, 4_000) || !isIsoTimestamp(value.updated_at))
    return false;
  try {
    return settingValidators[value.key]!(JSON.parse(value.value));
  } catch {
    return false;
  }
}

function isId(value: unknown) {
  return isText(value, 256);
}
function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}
function isNullableText(value: unknown, maxLength: number) {
  return value === null || value === undefined || (typeof value === "string" && value.length <= maxLength);
}
function isFiniteNumberInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
function isNullableNumberInRange(value: unknown, min: number, max: number) {
  return value === null || value === undefined || isFiniteNumberInRange(value, min, max);
}
function isIntegerInRange(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}
function isBoolean(value: unknown) {
  return typeof value === "boolean";
}
function isSqlBoolean(value: unknown) {
  return value === 0 || value === 1 || value === false || value === true;
}
function isLatitude(value: unknown) {
  return isFiniteNumberInRange(value, -90, 90);
}
function isLongitude(value: unknown) {
  return isFiniteNumberInRange(value, -180, 180);
}
function isCountryCode(value: unknown) {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}
function isNullableCountryCode(value: unknown) {
  return value === null || value === undefined || isCountryCode(value);
}
function isEnum(value: unknown, values: Set<string>) {
  return typeof value === "string" && values.has(value);
}
function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  );
}
function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}
function isNullableIsoTimestamp(value: unknown) {
  return value === null || value === undefined || isIsoTimestamp(value);
}
function isDateRange(start: unknown, end: unknown) {
  return isIsoDate(start) && isIsoDate(end) && start <= end;
}
function isTimestampRange(start: unknown, end: unknown) {
  return isIsoTimestamp(start) && isIsoTimestamp(end) && Date.parse(start) <= Date.parse(end);
}
function isCountryCodeArrayJson(value: unknown) {
  return isJsonArray(value, (item) => isCountryCode(item));
}
function isStringArrayJson(value: unknown, maxItemLength: number) {
  return isJsonArray(value, (item) => typeof item === "string" && item.length <= maxItemLength);
}
function isJsonArray(value: unknown, itemValidator: (item: unknown) => boolean) {
  if (!isText(value, 10_000)) return false;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length <= 512 && parsed.every(itemValidator);
  } catch {
    return false;
  }
}

async function restoreBackupPayload(payload: BackupPayload, file: DriveBackupFile, options: BackupProgressOptions = {}) {
  const now = new Date().toISOString();
  const restoreItems = createYearProgressItems("restore", getBackupPayloadYears(payload));
  emitProgress(options, "Restoring", "Preparing local database.", restoreItems);
  await runProgressItems(options, "Restoring", restoreItems);

  await runDbWriteTransaction(async (db) => {
    if (isAllEntriesBackup(payload)) {
      await db.runAsync("DELETE FROM pending_geocode_jobs");
      await db.runAsync("DELETE FROM day_country_segments");
      await db.runAsync("DELETE FROM day_records");
      await db.runAsync("DELETE FROM trips");
      await db.runAsync("DELETE FROM location_points");
    } else {
      const startDate = payload.scope.startDate;
      const endDate = payload.scope.endDate;
      const startTimestamp = `${startDate}T00:00:00.000Z`;
      const endTimestamp = `${endDate}T23:59:59.999Z`;

      await db.runAsync("DELETE FROM pending_geocode_jobs WHERE timestamp >= ? AND timestamp <= ?", startTimestamp, endTimestamp);
      await db.runAsync("DELETE FROM day_country_segments WHERE date >= ? AND date <= ?", startDate, endDate);
      await db.runAsync("DELETE FROM day_records WHERE date >= ? AND date <= ?", startDate, endDate);
      await db.runAsync("DELETE FROM trips WHERE start_date <= ? AND end_date >= ?", endDate, startDate);
      await db.runAsync("DELETE FROM location_points WHERE timestamp >= ? AND timestamp <= ?", startTimestamp, endTimestamp);
    }

    await insertBackupRows(db, "location_points", payload.data.location_points);
    await insertBackupRows(db, "day_records", payload.data.day_records);
    await insertBackupRows(db, "day_country_segments", payload.data.day_country_segments);
    await insertBackupRows(db, "trips", payload.data.trips);
    await insertBackupRows(db, "pending_geocode_jobs", payload.data.pending_geocode_jobs);
    await insertBackupRows(db, "settings", payload.data.settings);

    await db.runAsync(
      `INSERT INTO backup_metadata (id, backup_version, checksum, last_backup_at, drive_file_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uuid("restore"),
      payload.backupVersion,
      payload.checksum,
      file.modifiedTime ?? payload.createdAt,
      file.id,
      now,
      now
    );
  });
  emitProgress(options, "Restoring", "Backup restored.", completeProgressItems(restoreItems));
}

function isAllEntriesBackup(payload: BackupPayload) {
  return payload.scope.kind === "all";
}

function getBackupPayloadYears(payload: BackupPayload) {
  const years = new Set<string>();
  for (const row of payload.data.location_points ?? []) addYearFromRow(years, row, "timestamp");
  for (const row of payload.data.day_records ?? []) addYearFromRow(years, row, "date");
  for (const row of payload.data.day_country_segments ?? []) addYearFromRow(years, row, "date");
  for (const row of payload.data.trips ?? []) addYearFromRow(years, row, "start_date");
  for (const row of payload.data.pending_geocode_jobs ?? []) addYearFromRow(years, row, "timestamp");
  return [...years].sort();
}

function addYearFromRow(years: Set<string>, row: unknown, key: string) {
  if (!isRecord(row) || typeof row[key] !== "string") return;
  const year = row[key].slice(0, 4);
  if (/^\d{4}$/.test(year)) years.add(year);
}

function createYearProgressItems(kind: "backup" | "restore", years: string[]): BackupProgressItem[] {
  if (!years.length) {
    return [{ id: `${kind}-settings`, label: kind === "backup" ? "Backing up settings" : "Restoring settings", status: "pending" }];
  }

  return years.map((year) => ({
    id: `${kind}-${year}`,
    label: `${kind === "backup" ? "Backing up" : "Restoring"} data for year ${year}`,
    status: "pending"
  }));
}

async function runProgressItems(options: BackupProgressOptions, title: string, items: BackupProgressItem[]) {
  for (const [index, item] of items.entries()) {
    emitProgress(
      options,
      title,
      item.label,
      items.map((progressItem, progressIndex) => {
        if (progressIndex < index) return { ...progressItem, status: "complete" };
        if (progressItem.id === item.id) return { ...progressItem, status: "active" };
        return progressItem;
      })
    );
    await Promise.resolve();
  }
}

function completeProgressItems(items: BackupProgressItem[]) {
  return items.map((item) => ({ ...item, status: "complete" as const }));
}

function emitProgress(options: BackupProgressOptions, title: string, message: string, items: BackupProgressItem[]) {
  options.onProgress?.({ title, message, items });
}

async function insertBackupRows(db: Awaited<ReturnType<typeof getDb>>, table: BackupTable, rows: unknown[] | undefined) {
  if (!rows?.length) return;

  const columns = restoreTables[table];
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  for (const row of rows) {
    if (!isRecord(row)) throw new Error(`Backup contains an invalid ${table} row.`);
    await db.runAsync(
      sql,
      columns.map((column) => toSqlValue(row[column]))
    );
  }
}

function countBackupRows(payload: BackupPayload) {
  return (Object.keys(restoreTables) as BackupTable[]).reduce(
    (counts, table) => ({ ...counts, [table]: payload.data[table]?.length ?? 0 }),
    {} as Record<BackupTable, number>
  );
}

function countTravelRows(counts: Record<BackupTable, number>) {
  return counts.location_points + counts.day_records + counts.day_country_segments + counts.trips + counts.pending_geocode_jobs;
}

function getRestoreDisplayDate(payload: BackupPayload) {
  const dayRecord = payload.data.day_records?.find((row) => isRecord(row) && typeof row.date === "string");
  if (isRecord(dayRecord) && typeof dayRecord.date === "string") return dayRecord.date;

  const locationPoint = payload.data.location_points?.find((row) => isRecord(row) && typeof row.timestamp === "string");
  if (isRecord(locationPoint) && typeof locationPoint.timestamp === "string") return locationPoint.timestamp.slice(0, 10);

  const trip = payload.data.trips?.find((row) => isRecord(row) && typeof row.start_date === "string");
  if (isRecord(trip) && typeof trip.start_date === "string") return trip.start_date;

  return new Date().toISOString().slice(0, 10);
}

function toSqlValue(value: unknown) {
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveError(prefix: string, response: Response) {
  const body = await response.text();
  if (response.status === 401) {
    return new GoogleLoginRequiredError(
      `${prefix} with ${response.status}. Please log in with Google again. Backup won't work unless Google Drive is connected.`
    );
  }
  return new Error(`${prefix} with ${response.status}${formatDriveErrorBody(body)}`);
}

function formatDriveErrorBody(body: string) {
  if (!body) return "";

  try {
    const parsed = JSON.parse(body) as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.error)) return `: ${body}`;

    const message = typeof parsed.error.message === "string" ? parsed.error.message : undefined;
    const errors = Array.isArray(parsed.error.errors) ? parsed.error.errors : [];
    const reason = errors
      .map((entry) => (isRecord(entry) && typeof entry.reason === "string" ? entry.reason : undefined))
      .find((value): value is string => Boolean(value));

    return `: ${[reason, message].filter(Boolean).join(" - ") || body}`;
  } catch {
    return `: ${body}`;
  }
}
