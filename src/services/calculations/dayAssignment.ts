import { formatISO } from "date-fns";
import { runDbWriteTransaction } from "../../db/database";
import { toIsoDate, uuid } from "../../lib/utils";
import type { AppSettings, DayCountrySegment, LocationPoint } from "../../types/models";

export function buildSegmentsForDay(points: LocationPoint[]): DayCountrySegment[] {
  const sorted = [...points].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (sorted.length === 0) return [];

  return sorted.map((point, index) => {
    const next = sorted[index + 1];
    const fallbackEnd = new Date(point.timestamp);
    fallbackEnd.setUTCHours(23, 59, 59, 999);
    return {
      id: uuid("seg"),
      date: toIsoDate(point.timestamp),
      countryCode: point.countryCode,
      countryName: point.countryName,
      startTime: point.timestamp,
      endTime: next?.timestamp ?? fallbackEnd.toISOString(),
      source: point.source,
      confidence: point.reverseGeocodeStatus === "done" ? 0.9 : 0.25,
      isPendingValidation: point.reverseGeocodeStatus !== "done"
    };
  });
}

export function choosePrimaryCountry(segments: DayCountrySegment[], settings: AppSettings) {
  const valid = segments.filter((segment) => segment.countryCode);
  if (valid.length === 0) return undefined;
  if (settings.dayCountingRule === "departure") return valid[0];
  if (settings.dayCountingRule === "arrival") return valid[valid.length - 1];

  const durations = new Map<string, { segment: DayCountrySegment; ms: number }>();
  for (const segment of valid) {
    const ms = new Date(segment.endTime).getTime() - new Date(segment.startTime).getTime();
    const key = segment.countryCode ?? "unknown";
    const current = durations.get(key);
    durations.set(key, { segment, ms: (current?.ms ?? 0) + Math.max(0, ms) });
  }

  return [...durations.values()].sort((a, b) => b.ms - a.ms)[0]?.segment;
}

export async function recalculateDayForPoints(points: LocationPoint[], settings: AppSettings) {
  if (points.length === 0) return;
  const date = toIsoDate(points[0]!.timestamp);
  const now = formatISO(new Date());
  const segments = buildSegmentsForDay(points);
  const primary = choosePrimaryCountry(segments, settings);
  const countriesVisited = [...new Set(segments.map((segment) => segment.countryCode).filter(Boolean))] as string[];
  const isTravelDay = countriesVisited.length > 1;
  const isPending = segments.some((segment) => segment.isPendingValidation);

  await runDbWriteTransaction(async (db) => {
    await db.runAsync(
      `INSERT OR REPLACE INTO day_records (
        date, primary_country_code, primary_country_name, countries_visited,
        is_travel_day, is_pending_validation, is_manual_override, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        COALESCE((SELECT is_pending_validation FROM day_records WHERE date = ?), ?),
        COALESCE((SELECT is_manual_override FROM day_records WHERE date = ?), 0),
        COALESCE((SELECT created_at FROM day_records WHERE date = ?), ?),
        ?
      )`,
      date,
      primary?.countryCode ?? null,
      primary?.countryName ?? null,
      JSON.stringify(countriesVisited),
      isTravelDay ? 1 : 0,
      date,
      isPending ? 1 : 0,
      date,
      date,
      now,
      now
    );
    await db.runAsync("DELETE FROM day_country_segments WHERE date = ?", date);
    for (const segment of segments) {
      await db.runAsync(
        `INSERT INTO day_country_segments (
          id, date, country_code, country_name, start_time, end_time, source,
          confidence, is_pending_validation, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        segment.id,
        segment.date,
        segment.countryCode ?? null,
        segment.countryName ?? null,
        segment.startTime,
        segment.endTime,
        segment.source,
        segment.confidence,
        segment.isPendingValidation ? 1 : 0,
        now,
        now
      );
    }
  });
}
