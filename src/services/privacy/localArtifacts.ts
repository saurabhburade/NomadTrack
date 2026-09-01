import * as FileSystem from "expo-file-system/legacy";

/** Names are deliberately stable so reset can remove only files this app owns. */
export const localArtifactNames = {
  backup: (date: string) => `nomadtrack-backup-${date}.json`,
  csv: "nomadtrack-locations.csv",
  report: (kind: string, label: string) => `nomadtrack-report-${kind}-${sanitizeArtifactPart(label)}.pdf`
};

/** Deletes app-created exports and backups, including the names used by prior releases. */
export async function cleanupLocalArtifacts(): Promise<string[]> {
  const directory = FileSystem.documentDirectory;
  if (!directory) return [];

  const names = await FileSystem.readDirectoryAsync(directory);
  const deleted: string[] = [];
  for (const name of names) {
    if (!isNomadTrackArtifactName(name)) continue;
    const uri = `${directory}${name}`;
    await FileSystem.deleteAsync(uri, { idempotent: true });
    deleted.push(uri);
  }
  return deleted;
}

export function sanitizeArtifactPart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report"
  );
}

function isNomadTrackArtifactName(name: string) {
  return (
    /^nomadtrack-backup-\d{4}-\d{2}-\d{2}\.json$/.test(name) ||
    /^travel-nri-backup-\d{4}-\d{2}-\d{2}\.json$/.test(name) ||
    name === localArtifactNames.csv ||
    name === "travel-nri-export.csv" ||
    /^nomadtrack-report-(?:monthly|calendar|fiscal)-[a-z0-9-]+\.pdf$/.test(name) ||
    /^(?:monthly-travel-report|calendar-year-report|fiscal-year-report)-[a-z0-9-]+\.pdf$/.test(name)
  );
}
