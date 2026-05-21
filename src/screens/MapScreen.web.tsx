import { useState } from "react";
import { ScrollView, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderGlassButton, YearSelectorDrawer, getFiscalYearLabel } from "../components/year-selector-drawer";
import { Card } from "../components/ui/card";
import { Text } from "../components/ui/text";
import { getNeutralPalette } from "../lib/colors";
import { formatRelativeTime } from "../lib/utils";
import { useAppStore } from "../store/appStore";
import type { AppSettings, LocationPoint, Trip } from "../types/models";

export function MapScreen() {
  const { mapPoints, trips, settings, refresh, updateSetting } = useAppStore();
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getMapPalette(isDark);
  const manualDayEntries = getTripDayEntries(trips, settings);
  const gpsDayEntries = getGpsDayEntries(mapPoints, manualDayEntries);
  const dayEntries = getCombinedDayEntries(gpsDayEntries, manualDayEntries);
  const latest = dayEntries.at(-1);
  const yearLabel = getFiscalYearLabel(settings.residencyYearEnd, settings.calendarYearMode);

  async function saveResidencyYear(year: number, calendarYearMode: boolean) {
    await updateSetting("residencyYearEnd", Math.max(2000, Math.min(2100, year)));
    await updateSetting("calendarYearMode", calendarYearMode);
    await updateSetting("fiscalYearStartMonth", calendarYearMode ? 1 : 4);
    await updateSetting("fiscalYearStartDay", 1);
    await refresh();
  }

  return (
    <View className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: Math.max(insets.top, 0) + 20, paddingBottom: Math.max(insets.bottom, 10) + 118 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-3xl font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
            Footprint
          </Text>
          <HeaderGlassButton
            accessibilityLabel="Change residency year"
            active={isYearSelectorOpen}
            palette={palette}
            style={styles.yearHeaderButton}
            onPress={() => setIsYearSelectorOpen(true)}
          >
            <Text className="text-lg font-bold" style={{ color: palette.foreground }}>
              {yearLabel}
            </Text>
          </HeaderGlassButton>
        </View>

        <Card className="gap-3" style={{ backgroundColor: palette.card, borderColor: palette.border }}>
          <Text variant="subtitle" style={{ color: palette.foreground }}>Location Heatmap</Text>
          <Text variant="muted">
            Web preview lists selected year map days because native heatmap rendering is available only in the mobile app.
          </Text>
          <Text variant="caption">
            {yearLabel} - {dayEntries.length} {dayEntries.length === 1 ? "day" : "days"}
          </Text>
          {latest ? <Text variant="caption">Latest day {formatRelativeTime(latest.timestamp)}</Text> : null}
        </Card>

        <View className="mt-4 gap-3">
          {dayEntries.length === 0 ? (
            <Card style={{ backgroundColor: palette.card, borderColor: palette.border }}>
              <Text variant="muted">No map days for this year.</Text>
            </Card>
          ) : (
            dayEntries.map((entry) => (
              <Card key={`${entry.source}:${entry.date}`} className="gap-1" style={{ backgroundColor: palette.card, borderColor: palette.border }}>
                <Text variant="subtitle" style={{ color: palette.foreground }}>{entry.countryName ?? "Pending location"}</Text>
                <Text variant="muted">{entry.date}</Text>
                {typeof entry.latitude === "number" && typeof entry.longitude === "number" ? (
                  <Text variant="caption">
                    {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)} - GPS day
                  </Text>
                ) : (
                  <Text variant="caption">Manual entry day</Text>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>
      <YearSelectorDrawer
        palette={palette}
        visible={isYearSelectorOpen}
        year={settings.residencyYearEnd}
        calendarYearMode={settings.calendarYearMode}
        onClose={() => setIsYearSelectorOpen(false)}
        onConfirm={(year, calendarYearMode) => {
          setIsYearSelectorOpen(false);
          void saveResidencyYear(year, calendarYearMode);
        }}
      />
    </View>
  );
}

type MapDayEntry = {
  date: string;
  timestamp: string;
  countryCode?: string;
  countryName?: string;
  latitude?: number;
  longitude?: number;
  source: "gps" | "manual";
};

function getGpsDayEntries(points: LocationPoint[], manualDayEntries: MapDayEntry[]) {
  const manualDates = new Set(manualDayEntries.map((entry) => entry.date));
  const latestPointByDate = new Map<string, LocationPoint>();

  for (const point of points) {
    const date = point.timestamp.slice(0, 10);
    if (manualDates.has(date)) continue;

    const existing = latestPointByDate.get(date);
    if (!existing || point.timestamp > existing.timestamp) {
      latestPointByDate.set(date, point);
    }
  }

  return [...latestPointByDate.entries()]
    .map(([date, point]) => ({
      date,
      timestamp: point.timestamp,
      latitude: point.latitude,
      longitude: point.longitude,
      countryCode: point.countryCode,
      countryName: point.countryName,
      source: "gps" as const
    }))
    .sort((a, b) => a.date.localeCompare(b.date)) satisfies MapDayEntry[];
}

function getTripDayEntries(trips: Trip[], settings: AppSettings) {
  const window = getMapYearWindow(settings);
  const entriesByDate = new Map<string, MapDayEntry>();

  for (const trip of trips) {
    const startDate = maxIsoDate(trip.startDate, window.startDate);
    const endDate = minIsoDate(trip.endDate, window.endDate);
    if (startDate > endDate) continue;

    for (const date of enumerateIsoDates(startDate, endDate)) {
      entriesByDate.set(date, {
        date,
        timestamp: `${date}T12:00:00.000Z`,
        countryCode: trip.countryCode,
        countryName: trip.countryName,
        source: "manual"
      });
    }
  }

  return [...entriesByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function getCombinedDayEntries(gpsDayEntries: MapDayEntry[], manualDayEntries: MapDayEntry[]) {
  return [...gpsDayEntries, ...manualDayEntries].sort((a, b) => a.date.localeCompare(b.date));
}

function getMapYearWindow(settings: AppSettings) {
  const endYear = settings.residencyYearEnd || new Date().getFullYear();
  if (settings.calendarYearMode) {
    return {
      startDate: `${endYear}-01-01`,
      endDate: `${endYear}-12-31`
    };
  }

  const start = new Date(Date.UTC(endYear - 1, settings.fiscalYearStartMonth - 1, settings.fiscalYearStartDay));
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

function enumerateIsoDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function maxIsoDate(first: string, second: string) {
  return first > second ? first : second;
}

function minIsoDate(first: string, second: string) {
  return first < second ? first : second;
}

function getMapPalette(isDark: boolean) {
  const neutral = getNeutralPalette(isDark);

  return {
    screen: isDark ? neutral.backgroundPrimary : neutral.backgroundSecondary,
    card: isDark ? neutral.backgroundSecondary : neutral.backgroundPrimary,
    pill: isDark ? neutral.backgroundTertiary : neutral.backgroundPrimary,
    foreground: neutral.foreground,
    muted: neutral.foregroundSecondary,
    border: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
    accent: neutral.primary,
    accentForeground: neutral.primaryForeground,
    shadow: neutral.shadow,
    blurTint: (isDark ? "dark" : "light") as "dark" | "light",
    drawerBackdrop: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.32)",
    glassFill: isDark ? neutral.backgroundTertiary : neutral.backgroundPrimary,
    menuGlassFill: isDark ? neutral.backgroundSecondary : neutral.backgroundPrimary,
    glassHighlight: isDark ? "transparent" : "rgba(255,255,255,0.82)",
    glassLowlight: isDark ? "transparent" : "rgba(0,0,0,0.04)",
    glassBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
    glassBorderActive: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.18)",
    glassRim: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    glassShadow: neutral.shadow
  };
}

const styles = StyleSheet.create({
  yearHeaderButton: {
    height: 44,
    minWidth: 104,
    paddingHorizontal: 16
  }
});
