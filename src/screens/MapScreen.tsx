import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import MapView, { Circle, Polygon } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderGlassButton, YearSelectorDrawer, getFiscalYearLabel } from "../components/year-selector-drawer";
import { Card } from "../components/ui/card";
import { Text } from "../components/ui/text";
import { countryBoundaries } from "../data/countryBoundaries";
import { getNeutralPalette } from "../lib/colors";
import { formatRelativeTime } from "../lib/utils";
import { useAppStore } from "../store/appStore";
import type { AppSettings, LocationPoint, Trip } from "../types/models";

const worldRegion = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 140,
  longitudeDelta: 360
};
const mapAnimationDurationMs = 460;
const dashboardHeaderTopSpacing = 20;

export function MapScreen() {
  const { mapPoints, trips, settings, summary, refresh, updateSetting } = useAppStore();
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getMapPalette(isDark);
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const initialRegion = useMemo(() => getMapRegion(mapPoints), [mapPoints]);
  const visibleRegionRef = useRef(initialRegion);
  const manualDayEntries = useMemo(() => getTripDayEntries(trips, settings), [settings, trips]);
  const gpsDayEntries = useMemo(() => getGpsDayEntries(mapPoints, manualDayEntries), [manualDayEntries, mapPoints]);
  const dayEntries = useMemo(() => getCombinedDayEntries(gpsDayEntries, manualDayEntries), [gpsDayEntries, manualDayEntries]);
  const latest = dayEntries.at(-1);
  const countryAreas = useMemo(() => getCountryAreas(dayEntries, summary.countryTotals), [dayEntries, summary.countryTotals]);
  const maxCountryWeight = useMemo(() => Math.max(1, ...countryAreas.map((area) => area.weight)), [countryAreas]);
  const cityPoints = useMemo(() => getCityPoints(gpsDayEntries), [gpsDayEntries]);
  const maxCityWeight = useMemo(() => Math.max(1, ...cityPoints.map((point) => point.weight)), [cityPoints]);
  const yearLabel = getFiscalYearLabel(settings.residencyYearEnd, settings.calendarYearMode);

  useEffect(() => {
    visibleRegionRef.current = initialRegion;
    mapRef.current?.animateToRegion(initialRegion, mapAnimationDurationMs);
  }, [initialRegion]);

  function zoom(multiplier: number) {
    const currentRegion = visibleRegionRef.current;
    const nextRegion = {
      ...currentRegion,
      latitudeDelta: clamp(currentRegion.latitudeDelta * multiplier, 0.01, worldRegion.latitudeDelta),
      longitudeDelta: clamp(currentRegion.longitudeDelta * multiplier, 0.01, worldRegion.longitudeDelta)
    };
    visibleRegionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, mapAnimationDurationMs);
  }

  async function saveResidencyYear(year: number, calendarYearMode: boolean) {
    await updateSetting("residencyYearEnd", Math.max(2000, Math.min(2100, year)));
    await updateSetting("calendarYearMode", calendarYearMode);
    await updateSetting("fiscalYearStartMonth", calendarYearMode ? 1 : 4);
    await updateSetting("fiscalYearStartDay", 1);
    await refresh();
  }

  return (
    <View className="flex-1" style={{ backgroundColor: palette.screen }}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        zoomEnabled
        zoomControlEnabled={false}
        scrollEnabled
        onRegionChangeComplete={(nextRegion) => {
          visibleRegionRef.current = nextRegion;
        }}
      >
        {countryAreas.flatMap((area) => renderCountryArea(area, maxCountryWeight))}
        {cityPoints.flatMap((point) => renderCityPoint(point, maxCityWeight))}
      </MapView>
      <View pointerEvents="box-none" style={[styles.headerWrap, { top: insets.top + dashboardHeaderTopSpacing }]}>
        <View className="flex-row items-center justify-between gap-3">
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
      </View>
      <View pointerEvents="box-none" style={[styles.summaryWrap, { top: insets.top + dashboardHeaderTopSpacing + 60 }]}>
        <Card className="gap-1" style={[styles.summaryCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <Text variant="subtitle" style={{ color: palette.foreground }}>Country Footprint</Text>
          <Text variant="muted">
            {yearLabel} - {dayEntries.length} {dayEntries.length === 1 ? "day" : "days"}
          </Text>
          {latest ? <Text variant="caption">Latest day {formatRelativeTime(latest.timestamp)}</Text> : null}
        </Card>
      </View>
      <View style={[styles.zoomControls, { top: insets.top + dashboardHeaderTopSpacing + 150 }]}>
        <HeaderGlassButton accessibilityLabel="Zoom in" palette={palette} style={styles.zoomButton} onPress={() => zoom(0.55)}>
          <Text className="text-2xl font-semibold" style={{ color: palette.foreground, lineHeight: 28 }}>
            +
          </Text>
        </HeaderGlassButton>
        <HeaderGlassButton accessibilityLabel="Zoom out" palette={palette} style={styles.zoomButton} onPress={() => zoom(1.8)}>
          <Text className="text-2xl font-semibold" style={{ color: palette.foreground, lineHeight: 28 }}>
            -
          </Text>
        </HeaderGlassButton>
      </View>
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

type HeatPoint = {
  key: string;
  latitude: number;
  longitude: number;
  weight: number;
  countryCode?: string;
  countryName?: string;
  source: "gps" | "manual";
};

type CountryArea = {
  countryCode: string;
  countryName?: string;
  weight: number;
  polygons: Array<Array<{ latitude: number; longitude: number }>>;
};

type MapDayEntry = {
  date: string;
  timestamp: string;
  countryCode?: string;
  countryName?: string;
  latitude?: number;
  longitude?: number;
  source: "gps" | "manual";
};

function getMapRegion(_points: LocationPoint[]) {
  return { ...worldRegion };
}

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

function getCityPoints(gpsDayEntries: MapDayEntry[]) {
  const clusters = new Map<string, { latitudeSum: number; longitudeSum: number; weight: number; countryCode?: string; countryName?: string; source: "gps" | "manual" }>();

  function addCluster(key: string, latitude: number, longitude: number, entry: MapDayEntry) {
    const cluster = clusters.get(key) ?? { latitudeSum: 0, longitudeSum: 0, weight: 0, source: entry.source };
    cluster.latitudeSum += latitude;
    cluster.longitudeSum += longitude;
    cluster.weight += 1;
    cluster.countryCode ??= entry.countryCode;
    cluster.countryName ??= entry.countryName;
    clusters.set(key, cluster);
  }

  for (const entry of gpsDayEntries) {
    if (typeof entry.latitude !== "number" || typeof entry.longitude !== "number") continue;
    const latitudeKey = Math.round(entry.latitude * 100) / 100;
    const longitudeKey = Math.round(entry.longitude * 100) / 100;
    addCluster(`${entry.countryCode ?? "unknown"}:${latitudeKey}:${longitudeKey}`, entry.latitude, entry.longitude, entry);
  }

  return [...clusters.entries()]
    .map(([key, cluster]) => ({
      key,
      latitude: cluster.latitudeSum / cluster.weight,
      longitude: cluster.longitudeSum / cluster.weight,
      weight: cluster.weight,
      countryCode: cluster.countryCode,
      countryName: cluster.countryName,
      source: cluster.source
    }))
    .sort((a, b) => a.weight - b.weight) satisfies HeatPoint[];
}

function getCountryAreas(entries: MapDayEntry[], countryTotals: Array<{ countryCode: string; countryName: string; days: number }>) {
  const countries = new Map<string, { countryCode: string; countryName?: string; weight: number }>();

  for (const entry of entries) {
    if (!entry.countryCode) continue;
    const code = entry.countryCode.toUpperCase();
    const country = countries.get(code) ?? { countryCode: code, countryName: entry.countryName, weight: 0 };
    country.weight += 1;
    country.countryName ??= entry.countryName;
    countries.set(code, country);
  }

  for (const total of countryTotals) {
    const code = total.countryCode.toUpperCase();
    const country = countries.get(code) ?? { countryCode: code, countryName: total.countryName, weight: 0 };
    country.weight = Math.max(country.weight, total.days);
    country.countryName ??= total.countryName;
    countries.set(code, country);
  }

  return [...countries.values()]
    .reduce<CountryArea[]>((areas, country) => {
      const boundary = countryBoundaries[country.countryCode];
      if (!boundary) return areas;
      areas.push({
        ...country,
        countryName: country.countryName ?? boundary.name,
        polygons: boundary.polygons.map((polygon) => polygon.map(([longitude, latitude]) => ({ latitude, longitude })))
      });
      return areas;
    }, [])
    .sort((a, b) => a.weight - b.weight);
}

function renderCountryArea(area: CountryArea, maxWeight: number) {
  const intensity = Math.sqrt(area.weight / maxWeight);
  const fillOpacity = 0.2 + intensity * 0.28;
  const strokeOpacity = 0.62 + intensity * 0.28;
  const strokeWidth = 1.5;

  return area.polygons.map((coordinates, index) => (
    <Polygon
      key={`country:${area.countryCode}:${index}`}
      coordinates={coordinates}
      fillColor={`rgba(249,115,22,${fillOpacity})`}
      strokeColor={`rgba(220,38,38,${strokeOpacity})`}
      strokeWidth={strokeWidth}
      tappable
      zIndex={1}
    />
  ));
}

function renderCityPoint(point: HeatPoint, maxWeight: number) {
  const intensity = point.weight / maxWeight;
  const baseRadius = 18000;
  const radius = baseRadius + baseRadius * Math.min(1.6, Math.sqrt(intensity) * 1.6);
  const coordinate = { latitude: point.latitude, longitude: point.longitude };

  return [
    <Circle
      key={`city-outer:${point.key}`}
      center={coordinate}
      radius={radius}
      fillColor={`rgba(37,99,235,${0.12 + intensity * 0.16})`}
      strokeColor="rgba(37,99,235,0)"
      zIndex={4}
    />,
    <Circle
      key={`city-mid:${point.key}`}
      center={coordinate}
      radius={radius * 0.55}
      fillColor={`rgba(59,130,246,${0.2 + intensity * 0.2})`}
      strokeColor="rgba(59,130,246,0)"
      zIndex={5}
    />,
    <Circle
      key={`city-core:${point.key}`}
      center={coordinate}
      radius={radius * 0.24}
      fillColor={`rgba(14,165,233,${0.34 + intensity * 0.26})`}
      strokeColor="rgba(255,255,255,0.72)"
      strokeWidth={1}
      zIndex={6}
    />
  ];
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getMapPalette(isDark: boolean) {
  const neutral = getNeutralPalette(isDark);

  return {
    screen: isDark ? neutral.backgroundPrimary : neutral.backgroundSecondary,
    card: isDark ? neutral.backgroundSecondary : "rgba(255,255,255,0.92)",
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
  map: {
    ...StyleSheet.absoluteFillObject
  },
  headerWrap: {
    left: 20,
    position: "absolute",
    right: 20
  },
  yearHeaderButton: {
    height: 44,
    minWidth: 104,
    paddingHorizontal: 16
  },
  summaryWrap: {
    left: 16,
    position: "absolute",
    right: 16
  },
  summaryCard: {
    borderRadius: 18,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8
  },
  zoomControls: {
    gap: 10,
    position: "absolute",
    right: 16
  },
  zoomButton: {
    borderRadius: 18,
    height: 52,
    width: 52
  }
});
