import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";
import { getDb, readSettings, runDbWriteTransaction } from "../../db/database";
import { uuid } from "../../lib/utils";
import { getResidencyYearWindow } from "../calculations/residencyYear";
import { showStatusNotification } from "../notifications/statusNotifications";
import { assertGoogleAccessToken, getGoogleAccessToken, GoogleLoginRequiredError } from "../auth/googleAuth";

const driveFilesUrl = "https://www.googleapis.com/drive/v3/files";
const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files";
const driveRootFolderName = "NomadTrack";
const backupFileName = "travel-nri-tracker-backup.json";
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

type BackupTable =
  | "location_points"
  | "day_records"
  | "day_country_segments"
  | "trips"
  | "pending_geocode_jobs"
  | "settings";

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

export async function createJsonBackup(): Promise<BackupPayload> {
  const { serializedBackup } = await createSerializedJsonBackup();
  return JSON.parse(serializedBackup) as BackupPayload;
}

async function createSerializedJsonBackup(): Promise<{ header: BackupHeader; serializedBackup: string }> {
  const db = await getDb();
  const scope = await getBackupScope();
  const createdAt = new Date().toISOString();
  const data: Record<string, unknown[]> = {
    location_points: await db.getAllAsync("SELECT * FROM location_points WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC", `${scope.startDate}T00:00:00.000Z`, `${scope.endDate}T23:59:59.999Z`),
    day_records: await db.getAllAsync("SELECT * FROM day_records WHERE date >= ? AND date <= ? ORDER BY date ASC", scope.startDate, scope.endDate),
    day_country_segments: await db.getAllAsync("SELECT * FROM day_country_segments WHERE date >= ? AND date <= ? ORDER BY date ASC, start_time ASC", scope.startDate, scope.endDate),
    trips: await db.getAllAsync("SELECT * FROM trips WHERE start_date <= ? AND end_date >= ? ORDER BY start_date ASC", scope.endDate, scope.startDate),
    pending_geocode_jobs: await db.getAllAsync("SELECT * FROM pending_geocode_jobs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC", `${scope.startDate}T00:00:00.000Z`, `${scope.endDate}T23:59:59.999Z`),
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

  return { header, serializedBackup };
}

export async function writeLocalBackupFile() {
  const { header, serializedBackup } = await createSerializedJsonBackup();
  const path = `${FileSystem.documentDirectory}travel-nri-backup-${header.createdAt.slice(0, 10)}.json`;
  await FileSystem.writeAsStringAsync(path, serializedBackup);
  return path;
}

export async function uploadBackupToDrive() {
  const accessToken = await getGoogleAccessToken();
  assertGoogleAccessToken(accessToken);
  await showStatusNotification("Taking backup", "Uploading your latest travel backup to Google Drive.", { identifier: "nomadtrack-status-backup" });
  const { header, serializedBackup } = await createSerializedJsonBackup();
  const folderId = await getOrCreateDriveBackupFolder(accessToken, header.scope.label);
  const existingBackup = await findDriveBackupFile(accessToken, folderId);
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

    const travelRows = await countCurrentBackupTravelRows();
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

export async function restoreLatestDriveBackup() {
  const accessToken = await getGoogleAccessToken();
  assertGoogleAccessToken(accessToken);
  const backupFiles = await listDriveBackupsWithToken(accessToken);
  const sortedFiles = backupFiles.files.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
  if (!sortedFiles.length) throw new Error("No Drive backup found to restore.");

  let settingsOnlyBackup:
    | { file: DriveBackupFile; payload: BackupPayload; counts: Record<BackupTable, number>; displayDate: string }
    | undefined;
  let lastError: unknown;
  for (const file of sortedFiles) {
    try {
      const payload = await downloadAndValidateDriveBackup(accessToken, file);
      const counts = countBackupRows(payload);
      const displayDate = getRestoreDisplayDate(payload);
      if (countTravelRows(counts) > 0) {
        await restoreBackupPayload(payload, file);
        return { file, backup: payload, restoredRows: counts, displayDate };
      }
      settingsOnlyBackup ??= { file, payload, counts, displayDate };
    } catch (error) {
      lastError = error;
    }
  }

  if (settingsOnlyBackup) {
    await restoreBackupPayload(settingsOnlyBackup.payload, settingsOnlyBackup.file);
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
  const settings = await readSettings();
  const year = settings.residencyYearEnd;
  const window = getResidencyYearWindow(settings, year);
  return {
    label: String(year),
    startDate: window.startDate,
    endDate: window.endDate
  };
}

async function readLatestBackupTime() {
  const db = await getDb();
  const latest = await db.getFirstAsync<{ lastBackupAt: string }>(
    "SELECT last_backup_at as lastBackupAt FROM backup_metadata ORDER BY last_backup_at DESC LIMIT 1"
  );
  return latest?.lastBackupAt;
}

async function countCurrentBackupTravelRows() {
  const db = await getDb();
  const scope = await getBackupScope();
  const startTimestamp = `${scope.startDate}T00:00:00.000Z`;
  const endTimestamp = `${scope.endDate}T23:59:59.999Z`;
  const locationPoints = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM location_points WHERE timestamp >= ? AND timestamp <= ?",
    startTimestamp,
    endTimestamp
  );
  const dayRecords = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM day_records WHERE date >= ? AND date <= ?",
    scope.startDate,
    scope.endDate
  );
  const trips = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM trips WHERE start_date <= ? AND end_date >= ?",
    scope.endDate,
    scope.startDate
  );

  return (locationPoints?.count ?? 0) + (dayRecords?.count ?? 0) + (trips?.count ?? 0);
}

async function getOrCreateDriveBackupFolder(accessToken: string, yearFolderName: string) {
  const rootFolderId = await getOrCreateDriveFolder(accessToken, driveRootFolderName);
  return getOrCreateDriveFolder(accessToken, yearFolderName, rootFolderId);
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
  const query = encodeURIComponent(`name = '${escapeDriveQueryValue(folderName)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentQuery}`);
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

  const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(parsed.data));
  if (checksum !== parsed.checksum) {
    throw new Error("Backup checksum did not match. Restore was cancelled.");
  }

  return parsed;
}

async function downloadAndValidateDriveBackup(accessToken: string, file: DriveBackupFile) {
  const response = await fetch(`${driveFilesUrl}/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw await driveError("Drive backup download failed", response);
  return parseAndValidateBackup(await response.text());
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!isRecord(value)) return false;
  if (value.backupVersion !== 1 || typeof value.createdAt !== "string" || typeof value.checksum !== "string") return false;
  if (!isRecord(value.scope)) return false;
  if (typeof value.scope.label !== "string" || typeof value.scope.startDate !== "string" || typeof value.scope.endDate !== "string") return false;
  if (!isRecord(value.data)) return false;
  const data = value.data;

  return (Object.keys(restoreTables) as BackupTable[]).every((table) => {
    const rows = data[table];
    return rows === undefined || Array.isArray(rows);
  });
}

async function restoreBackupPayload(payload: BackupPayload, file: DriveBackupFile) {
  const now = new Date().toISOString();
  const startDate = payload.scope.startDate;
  const endDate = payload.scope.endDate;
  const startTimestamp = `${startDate}T00:00:00.000Z`;
  const endTimestamp = `${endDate}T23:59:59.999Z`;

  await runDbWriteTransaction(async (db) => {
    await db.runAsync("DELETE FROM pending_geocode_jobs WHERE timestamp >= ? AND timestamp <= ?", startTimestamp, endTimestamp);
    await db.runAsync("DELETE FROM day_country_segments WHERE date >= ? AND date <= ?", startDate, endDate);
    await db.runAsync("DELETE FROM day_records WHERE date >= ? AND date <= ?", startDate, endDate);
    await db.runAsync("DELETE FROM trips WHERE start_date <= ? AND end_date >= ?", endDate, startDate);
    await db.runAsync("DELETE FROM location_points WHERE timestamp >= ? AND timestamp <= ?", startTimestamp, endTimestamp);

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
}

async function insertBackupRows(db: Awaited<ReturnType<typeof getDb>>, table: BackupTable, rows: unknown[] | undefined) {
  if (!rows?.length) return;

  const columns = restoreTables[table];
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

  for (const row of rows) {
    if (!isRecord(row)) throw new Error(`Backup contains an invalid ${table} row.`);
    await db.runAsync(sql, columns.map((column) => toSqlValue(row[column])));
  }
}

function countBackupRows(payload: BackupPayload) {
  return (Object.keys(restoreTables) as BackupTable[]).reduce(
    (counts, table) => ({ ...counts, [table]: payload.data[table]?.length ?? 0 }),
    {} as Record<BackupTable, number>
  );
}

function countTravelRows(counts: Record<BackupTable, number>) {
  return (
    counts.location_points +
    counts.day_records +
    counts.day_country_segments +
    counts.trips +
    counts.pending_geocode_jobs
  );
}

function getRestoreDisplayDate(payload: BackupPayload) {
  const dayRecord = payload.data.day_records?.find((row) => isRecord(row) && typeof row.date === "string");
  if (isRecord(dayRecord) && typeof dayRecord.date === "string") return dayRecord.date;

  const locationPoint = payload.data.location_points?.find((row) => isRecord(row) && typeof row.timestamp === "string");
  if (isRecord(locationPoint) && typeof locationPoint.timestamp === "string") return locationPoint.timestamp.slice(0, 10);

  const trip = payload.data.trips?.find((row) => isRecord(row) && typeof row.start_date === "string");
  if (isRecord(trip) && typeof trip.start_date === "string") return trip.start_date;

  return payload.scope.startDate;
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
    return new GoogleLoginRequiredError(`${prefix} with ${response.status}. Please log in with Google again. Backup won't work unless Google Drive is connected.`);
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
