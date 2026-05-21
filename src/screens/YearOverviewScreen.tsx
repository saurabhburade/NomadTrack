import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, useColorScheme, useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { CalendarDays, ChevronLeft, Clock3, Crown, Map as MapIcon, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/ui/text";
import { HeaderGlassButton, YearSelectorDrawer } from "../components/year-selector-drawer";
import { compactNumber } from "../lib/utils";
import { getNeutralPalette, iconStrokeWidth } from "../lib/colors";
import {
  formatResidencyYearLabel,
  getResidencyYearDayCount,
  getResidencyYearMonths,
  getResidencyYearWindow
} from "../services/calculations/residencyYear";
import { useAppStore } from "../store/appStore";
import type { RootTabParamList } from "../navigation/AppNavigator";

type YearOverviewNavigation = BottomTabNavigationProp<RootTabParamList, "YearOverview">;
type Palette = ReturnType<typeof getPalette>;
type MonthSlot = { key: string; iso?: string };

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function YearOverviewScreen() {
  const navigation = useNavigation<YearOverviewNavigation>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const { width } = useWindowDimensions();
  const { refresh, settings, summary, updateSetting, yearRecords } = useAppStore();
  const [isYearSelectorOpen, setIsYearSelectorOpen] = useState(false);
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getPalette(isDark);
  const yearDayCount = getResidencyYearDayCount(settings);
  const totalTrackedDays = summary.countryTotals.reduce((sum, row) => sum + row.days, 0);
  const remainingDays = Math.max(0, yearDayCount - totalTrackedDays);
  const topCountries = summary.countryTotals.slice(0, 3);
  const otherDays = Math.max(0, summary.countryTotals.slice(3).reduce((sum, row) => sum + row.days, 0));
  const window = useMemo(() => getResidencyYearWindow(settings), [settings]);
  const months = useMemo(() => getResidencyYearMonths(settings), [settings]);
  const recordsByDate = useMemo(() => new Map(yearRecords.map((record) => [record.date, record])), [yearRecords]);
  const countryColorByCode = useMemo(() => {
    const colors = new Map<string, string>();
    topCountries.forEach((row, index) => colors.set(row.countryCode, getOverviewDistributionColor(index, palette)));
    return colors;
  }, [palette, topCountries]);
  const yearLabel = formatResidencyYearLabel(settings.residencyYearEnd, settings.calendarYearMode);
  const todayIso = new Date().toISOString().slice(0, 10);
  const contentWidth = Math.min(width, 640);
  const horizontalPadding = width < 360 ? 20 : 24;
  const monthColumns = contentWidth >= 760 ? 4 : 3;
  const monthGap = width < 360 ? 16 : 24;
  const monthColumnWidth = Math.floor((contentWidth - horizontalPadding * 2 - monthGap * (monthColumns - 1)) / monthColumns);
  const dotGap = width < 360 ? 4 : 5;
  const dotSize = Math.max(7, Math.min(10, Math.floor((monthColumnWidth - dotGap * 6) / 7)));
  const legendColumns = contentWidth < 640 ? 2 : 3;
  const legendGap = width < 360 ? 14 : 20;
  const legendItemWidth = Math.floor((contentWidth - horizontalPadding * 2 - legendGap * (legendColumns - 1)) / legendColumns);
  const insightGap = 16;
  const insightWidth = Math.floor((contentWidth - horizontalPadding * 2 - insightGap) / 2);
  const topCountry = topCountries[0];
  const topCountryPercent = topCountry ? Math.round((topCountry.days / yearDayCount) * 100) : 0;
  const travelDays = yearRecords.filter((record) => record.is_travel_day).length;
  const legendItems = [
    ...topCountries.map((row, index) => ({
      key: row.countryCode,
      color: getOverviewDistributionColor(index, palette),
      label: row.countryName,
      value: row.days,
      muted: false
    })),
    ...(otherDays > 0
      ? [
          {
            key: "others",
            color: getOverviewDistributionColor(3, palette),
            label: "Others",
            value: otherDays,
            muted: false
          }
        ]
      : []),
    {
      key: "remaining",
      color: palette.remaining,
      label: "Remaining",
      value: remainingDays,
      muted: true
    }
  ];

  function closeOverview() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Dashboard");
  }

  async function saveResidencyYear(year: number, calendarYearMode: boolean) {
    await updateSetting("residencyYearEnd", Math.max(2000, Math.min(2100, year)));
    await updateSetting("calendarYearMode", calendarYearMode);
    await updateSetting("fiscalYearStartMonth", calendarYearMode ? 1 : 4);
    await updateSetting("fiscalYearStartDay", 1);
    await refresh();
  }

  function dotColorForDate(iso: string) {
    if (iso < window.startDate || iso > window.endDate) return "transparent";

    const record = recordsByDate.get(iso);
    const code = record?.primary_country_code;
    if (!code) return palette.remaining;

    return countryColorByCode.get(code) ?? getOverviewDistributionColor(3, palette);
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 10) + 144,
            paddingHorizontal: horizontalPadding,
            paddingTop: insets.top + 8
          }
        ]}
        style={{ backgroundColor: palette.screen }}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={[styles.content, { maxWidth: 640 }]}>
          <View style={styles.headerRow}>
            <Text className="flex-1 text-3xl font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
              Overview
            </Text>
            <View style={styles.headerActions}>
              <HeaderGlassButton
                accessibilityLabel="Change residency year"
                active={isYearSelectorOpen}
                palette={palette}
                style={styles.yearHeaderButton}
                onPress={() => setIsYearSelectorOpen(true)}
              >
                <Text className="text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
                  {yearLabel}
                </Text>
              </HeaderGlassButton>
              <HeaderGlassButton accessibilityLabel="Back to dashboard" palette={palette} style={styles.iconHeaderButton} onPress={closeOverview}>
                <ChevronLeft size={27} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              </HeaderGlassButton>
            </View>
          </View>

          <View style={[styles.legendGrid, { columnGap: legendGap, rowGap: 16 }]}>
            {legendItems.map((item) => (
              <OverviewLegendItem
                key={item.key}
                color={item.color}
                label={item.label}
                muted={item.muted}
                palette={palette}
                value={item.value}
                width={legendItemWidth}
              />
            ))}
          </View>

          <View style={[styles.monthGrid, { columnGap: monthGap, rowGap: 28 }]}>
            {months.map((month) => (
              <MonthDots
                key={month.key}
                calendarYearMode={settings.calendarYearMode}
                dotGap={dotGap}
                dotSize={dotSize}
                monthIndex={month.monthIndex}
                palette={palette}
                todayIso={todayIso}
                width={monthColumnWidth}
                year={month.year}
                getDotColor={dotColorForDate}
              />
            ))}
          </View>

          <Text className="text-2xl font-extrabold" style={[styles.sectionTitle, { color: palette.foreground }]}>
            Yearly Insights
          </Text>

          <View style={[styles.insightGrid, { columnGap: insightGap, rowGap: insightGap }]}>
            <InsightCard
              icon={Crown}
              label={topCountry ? `Top share: ${topCountry.countryName}` : "Top share"}
              palette={palette}
              tint={palette.orangeTint}
              value={`${topCountryPercent}%`}
              width={insightWidth}
            />
            <InsightCard
              icon={MapIcon}
              label="Countries visited"
              palette={palette}
              tint={palette.blueTint}
              value={compactNumber(summary.countryTotals.length)}
              width={insightWidth}
            />
            <InsightCard
              icon={CalendarDays}
              label="Tracked days"
              palette={palette}
              tint={palette.greenTint}
              value={compactNumber(totalTrackedDays)}
              width={insightWidth}
            />
            <InsightCard
              icon={Clock3}
              label={travelDays > 0 ? "Travel days" : "Days remaining"}
              palette={palette}
              tint={palette.purpleTint}
              value={compactNumber(travelDays > 0 ? travelDays : remainingDays)}
              width={insightWidth}
            />
          </View>
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
    </>
  );
}

function OverviewLegendItem({
  color,
  label,
  muted,
  palette,
  value,
  width
}: {
  color: string;
  label: string;
  muted: boolean;
  palette: Palette;
  value: number;
  width: number;
}) {
  const textColor = muted ? palette.muted : palette.foreground;
  return (
    <View style={[styles.legendItem, { width }]}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text className="flex-1 text-base font-bold" numberOfLines={1} style={{ color: textColor }}>
        {label}
      </Text>
      <Text className="text-base font-extrabold" numberOfLines={1} style={{ color: palette.muted }}>
        {compactNumber(value)}
      </Text>
    </View>
  );
}

function MonthDots({
  calendarYearMode,
  dotGap,
  dotSize,
  getDotColor,
  monthIndex,
  palette,
  todayIso,
  width,
  year
}: {
  calendarYearMode: boolean;
  dotGap: number;
  dotSize: number;
  getDotColor: (iso: string) => string;
  monthIndex: number;
  palette: Palette;
  todayIso: string;
  width: number;
  year: number;
}) {
  const slots = useMemo(() => buildMonthSlots(year, monthIndex), [monthIndex, year]);
  const gridWidth = dotSize * 7 + dotGap * 6;
  const monthName = monthNames[monthIndex] ?? "";
  const label = calendarYearMode ? monthName : `${monthName} '${String(year).slice(-2)}`;

  return (
    <View style={[styles.monthTile, { width }]}>
      <Text className="text-lg font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.monthLabel }}>
        {label}
      </Text>
      <View style={[styles.monthDotGrid, { gap: dotGap, width: gridWidth }]}>
        {slots.map((slot) => {
          if (!slot.iso) {
            return <View key={slot.key} style={{ height: dotSize, width: dotSize }} />;
          }

          const backgroundColor = getDotColor(slot.iso);
          const isToday = slot.iso === todayIso && backgroundColor !== "transparent";

          return (
            <View
              key={slot.key}
              accessibilityLabel={slot.iso}
              style={[
                styles.monthDot,
                {
                  backgroundColor,
                  borderColor: isToday ? palette.todayRing : "transparent",
                  borderWidth: isToday ? 2 : 0,
                  height: dotSize,
                  opacity: backgroundColor === "transparent" ? 0 : 1,
                  width: dotSize
                }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function InsightCard({
  icon: Icon,
  label,
  palette,
  tint,
  value,
  width
}: {
  icon: LucideIcon;
  label: string;
  palette: Palette;
  tint: string;
  value: string;
  width: number;
}) {
  return (
    <View style={[styles.insightCard, { backgroundColor: palette.insightCard, width }]}>
      <View style={styles.insightTopRow}>
        <Text className="flex-1 text-4xl font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
          {value}
        </Text>
        <View style={[styles.insightIcon, { backgroundColor: tint }]}>
          <Icon color={palette.foreground} size={26} strokeWidth={iconStrokeWidth} />
        </View>
      </View>
      <Text className="text-xs font-bold" numberOfLines={2} style={{ color: palette.muted }}>
        {label}
      </Text>
    </View>
  );
}

function buildMonthSlots(year: number, monthIndex: number): MonthSlot[] {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const slots: MonthSlot[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    slots.push({ key: `empty-${year}-${monthIndex}-${index}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    slots.push({ key: iso, iso });
  }

  return slots;
}

function getOverviewDistributionColor(index: number, palette: Palette) {
  return palette.distributionColors[index] ?? palette.foreground;
}

function getPalette(isDark: boolean) {
  const neutral = getNeutralPalette(isDark);

  return {
    screen: isDark ? "#050505" : neutral.backgroundSecondary,
    foreground: neutral.foreground,
    muted: neutral.foregroundSecondary,
    border: neutral.border,
    card: isDark ? neutral.backgroundSecondary : neutral.backgroundPrimary,
    pill: isDark ? neutral.backgroundTertiary : neutral.backgroundPrimary,
    accent: neutral.primary,
    accentForeground: neutral.primaryForeground,
    monthLabel: isDark ? "#9a9aa2" : "#62626a",
    backButton: isDark ? neutral.backgroundSecondary : "rgba(255,255,255,0.82)",
    backBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
    remaining: isDark ? "#3a3a3d" : "#d3d3d6",
    todayRing: isDark ? "#ffffff" : "#0a0a0a",
    insightCard: isDark ? "#232323" : "#ffffff",
    blurTint: (isDark ? "dark" : "light") as "dark" | "light",
    drawerBackdrop: isDark ? "rgba(0,0,0,0.76)" : "rgba(0,0,0,0.32)",
    glassFill: isDark ? neutral.backgroundSecondary : neutral.backgroundPrimary,
    menuGlassFill: neutral.backgroundPrimary,
    glassHighlight: isDark ? "transparent" : "rgba(255,255,255,0.82)",
    glassLowlight: isDark ? "transparent" : "rgba(0,0,0,0.04)",
    glassBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
    glassBorderActive: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.18)",
    glassRim: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    glassShadow: neutral.shadow,
    orangeTint: isDark ? "rgba(245,140,42,0.18)" : "rgba(245,140,42,0.16)",
    blueTint: isDark ? "rgba(101,118,255,0.18)" : "rgba(41,91,255,0.14)",
    greenTint: isDark ? "rgba(116,170,90,0.18)" : "rgba(22,163,74,0.13)",
    purpleTint: isDark ? "rgba(169,90,204,0.18)" : "rgba(126,34,206,0.12)",
    distributionColors: isDark
      ? ["#a77c9a", "#aaad78", "#988171", "#8c2aa2", "#c85ce6", "#64748b"]
      : ["#9b5f8b", "#7f873f", "#8f705e", "#8a2ba2", "#b83280", "#64748b"]
  };
}

const styles = StyleSheet.create({
  scrollContent: {
    minHeight: "100%"
  },
  content: {
    alignSelf: "center",
    width: "100%"
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 22
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8
  },
  iconHeaderButton: {
    height: 44,
    width: 44
  },
  yearHeaderButton: {
    height: 44,
    minWidth: 104,
    paddingHorizontal: 16
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 34
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    minWidth: 0
  },
  legendDot: {
    borderRadius: 999,
    height: 11,
    width: 11
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  monthTile: {
    gap: 14
  },
  monthDotGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  monthDot: {
    borderRadius: 999
  },
  sectionTitle: {
    marginBottom: 24,
    marginTop: 42
  },
  insightGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  insightCard: {
    borderRadius: 28,
    gap: 18,
    justifyContent: "space-between",
    minHeight: 126,
    paddingHorizontal: 22,
    paddingVertical: 20
  },
  insightTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    minWidth: 0
  },
  insightIcon: {
    alignItems: "center",
    borderRadius: 999,
    flexShrink: 0,
    height: 52,
    justifyContent: "center",
    width: 52
  }
});
