import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { getDb, readSettings } from "../../db/database";
import { uuid } from "../../lib/utils";
import { assertGoogleAccessToken, getGoogleAccessToken, GoogleLoginRequiredError } from "../auth/googleAuth";

const driveFilesUrl = "https://www.googleapis.com/drive/v3/files";
const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files";
const driveRootFolderName = "NomadTrack";
const backupFileName = "travel-nri-tracker-backup.json";

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
  const db = await getDb();
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
  return result;
}

export async function listDriveBackups() {
  const accessToken = await getGoogleAccessToken();
  assertGoogleAccessToken(accessToken);
  const folderId = await getOrCreateDriveBackupFolder(accessToken, (await getBackupScope()).label);
  const query = encodeURIComponent(`name = '${escapeDriveQueryValue(backupFileName)}' and '${folderId}' in parents and trashed = false`);
  const response = await fetch(`${driveFilesUrl}?spaces=drive&q=${query}&fields=files(id,name,modifiedTime,size,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw await driveError("Drive list failed", response);
  return response.json() as Promise<{ files: Array<{ id: string; name: string; modifiedTime: string; size?: string; webViewLink?: string }> }>;
}

async function getBackupScope() {
  const settings = await readSettings();
  const year = settings.residencyYearEnd;
  return {
    label: String(year),
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  };
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

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveError(prefix: string, response: Response) {
  const body = await response.text();
  if (response.status === 401 || response.status === 403) {
    return new GoogleLoginRequiredError(`${prefix} with ${response.status}. Please log in with Google again. Backup won't work unless Google Drive is connected.`);
  }
  return new Error(`${prefix} with ${response.status}${body ? `: ${body}` : ""}`);
}
