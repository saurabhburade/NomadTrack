import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getDb } from "../../db/database";
import { localArtifactNames } from "../privacy/localArtifacts";

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
  const path = `${FileSystem.documentDirectory}${localArtifactNames.csv}`;
  await FileSystem.writeAsStringAsync(path, csv);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: "text/csv" });
  return path;
}

export function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = neutralizeSpreadsheetFormula(String(value));
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Prefix values Excel/Sheets could evaluate, even when hidden whitespace comes first. */
export function neutralizeSpreadsheetFormula(value: string) {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Control bytes before a formula marker must be neutralized for spreadsheet safety.
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
}
