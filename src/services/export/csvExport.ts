import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getDb } from "../../db/database";

export async function exportLocationCsv() {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, string | number | null>>(
    `SELECT
      substr(timestamp, 1, 10) as date,
      country_name as country,
      city,
      region as state,
      source,
      CASE reverse_geocode_status WHEN 'done' THEN 0.9 ELSE 0.25 END as confidence,
      latitude,
      longitude
    FROM location_points
    ORDER BY timestamp ASC`
  );
  const columns = ["date", "country", "city", "state", "source", "confidence", "latitude", "longitude"];
  const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(","))].join("\n");
  const path = `${FileSystem.documentDirectory}travel-nri-export.csv`;
  await FileSystem.writeAsStringAsync(path, csv);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: "text/csv" });
  return path;
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
