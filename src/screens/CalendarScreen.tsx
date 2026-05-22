import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isAfter, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Globe2, Images, PencilLine, Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, useColorScheme, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing as ReanimatedEasing, Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/ui/text";
import { getNeutralPalette, iconStrokeWidth } from "../lib/colors";
import { useAppStore } from "../store/appStore";

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
type CountryOption = { code: string; name: string };

const priorityCountryCodes = ["IN", "US", "GB", "AE", "SG", "CA", "AU", "DE", "FR", "JP", "TH", "MY", "ID", "LK", "NP", "BD"] as const;
const isoCountryCodes = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "XK", "YE", "YT", "ZA", "ZM", "ZW"
] as const;
const countryNameOverrides: Record<string, string> = {
  AD: "Andorra",
  AE: "United Arab Emirates",
  AF: "Afghanistan",
  AG: "Antigua and Barbuda",
  AI: "Anguilla",
  AL: "Albania",
  AM: "Armenia",
  AO: "Angola",
  AQ: "Antarctica",
  AR: "Argentina",
  AS: "American Samoa",
  AT: "Austria",
  AU: "Australia",
  AW: "Aruba",
  AX: "Aland Islands",
  AZ: "Azerbaijan",
  BA: "Bosnia and Herzegovina",
  BB: "Barbados",
  BD: "Bangladesh",
  BE: "Belgium",
  BF: "Burkina Faso",
  BG: "Bulgaria",
  BH: "Bahrain",
  BI: "Burundi",
  BJ: "Benin",
  BL: "Saint Barthelemy",
  BM: "Bermuda",
  BN: "Brunei",
  BO: "Bolivia",
  BQ: "Caribbean Netherlands",
  BR: "Brazil",
  BS: "Bahamas",
  BT: "Bhutan",
  BV: "Bouvet Island",
  BW: "Botswana",
  BY: "Belarus",
  BZ: "Belize",
  CA: "Canada",
  CC: "Cocos (Keeling) Islands",
  CD: "Congo - Kinshasa",
  CF: "Central African Republic",
  CG: "Congo - Brazzaville",
  CH: "Switzerland",
  CI: "Cote d'Ivoire",
  CK: "Cook Islands",
  CL: "Chile",
  CM: "Cameroon",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  CV: "Cape Verde",
  CW: "Curacao",
  CX: "Christmas Island",
  CY: "Cyprus",
  CZ: "Czechia",
  DE: "Germany",
  DJ: "Djibouti",
  DK: "Denmark",
  DM: "Dominica",
  DO: "Dominican Republic",
  DZ: "Algeria",
  EC: "Ecuador",
  EE: "Estonia",
  EG: "Egypt",
  EH: "Western Sahara",
  ER: "Eritrea",
  ES: "Spain",
  ET: "Ethiopia",
  FI: "Finland",
  FJ: "Fiji",
  FK: "Falkland Islands",
  FM: "Micronesia",
  FO: "Faroe Islands",
  FR: "France",
  GA: "Gabon",
  GB: "United Kingdom",
  GD: "Grenada",
  GE: "Georgia",
  GF: "French Guiana",
  GG: "Guernsey",
  GH: "Ghana",
  GI: "Gibraltar",
  GL: "Greenland",
  GM: "Gambia",
  GN: "Guinea",
  GP: "Guadeloupe",
  GQ: "Equatorial Guinea",
  GR: "Greece",
  GS: "South Georgia and South Sandwich Islands",
  GT: "Guatemala",
  GU: "Guam",
  GW: "Guinea-Bissau",
  GY: "Guyana",
  HK: "Hong Kong SAR China",
  HM: "Heard Island and McDonald Islands",
  HN: "Honduras",
  HR: "Croatia",
  HT: "Haiti",
  HU: "Hungary",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IM: "Isle of Man",
  IN: "India",
  IO: "British Indian Ocean Territory",
  IQ: "Iraq",
  IR: "Iran",
  IS: "Iceland",
  IT: "Italy",
  JE: "Jersey",
  JM: "Jamaica",
  JO: "Jordan",
  JP: "Japan",
  KE: "Kenya",
  KG: "Kyrgyzstan",
  KH: "Cambodia",
  KI: "Kiribati",
  KM: "Comoros",
  KN: "St. Kitts and Nevis",
  KP: "North Korea",
  KR: "South Korea",
  KW: "Kuwait",
  KY: "Cayman Islands",
  KZ: "Kazakhstan",
  LA: "Laos",
  LB: "Lebanon",
  LC: "St. Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  LY: "Libya",
  MA: "Morocco",
  MC: "Monaco",
  MD: "Moldova",
  ME: "Montenegro",
  MF: "St. Martin",
  MG: "Madagascar",
  MH: "Marshall Islands",
  MK: "North Macedonia",
  ML: "Mali",
  MM: "Myanmar (Burma)",
  MN: "Mongolia",
  MO: "Macao",
  MP: "Northern Mariana Islands",
  MQ: "Martinique",
  MR: "Mauritania",
  MS: "Montserrat",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Maldives",
  MW: "Malawi",
  MX: "Mexico",
  MY: "Malaysia",
  MZ: "Mozambique",
  NA: "Namibia",
  NC: "New Caledonia",
  NE: "Niger",
  NF: "Norfolk Island",
  NG: "Nigeria",
  NI: "Nicaragua",
  NL: "Netherlands",
  NO: "Norway",
  NP: "Nepal",
  NR: "Nauru",
  NU: "Niue",
  NZ: "New Zealand",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PF: "French Polynesia",
  PG: "Papua New Guinea",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PM: "St. Pierre and Miquelon",
  PN: "Pitcairn Islands",
  PR: "Puerto Rico",
  PS: "Palestine",
  PT: "Portugal",
  PW: "Palau",
  PY: "Paraguay",
  QA: "Qatar",
  RE: "Reunion",
  RO: "Romania",
  RS: "Serbia",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SB: "Solomon Islands",
  SC: "Seychelles",
  SD: "Sudan",
  SE: "Sweden",
  SG: "Singapore",
  SH: "Saint Helena",
  SI: "Slovenia",
  SJ: "Svalbard and Jan Mayen",
  SK: "Slovakia",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Suriname",
  SS: "South Sudan",
  ST: "Sao Tome and Principe",
  SV: "El Salvador",
  SX: "Sint Maarten",
  SY: "Syria",
  SZ: "Eswatini",
  TC: "Turks and Caicos Islands",
  TD: "Chad",
  TF: "French Southern Territories",
  TG: "Togo",
  TH: "Thailand",
  TJ: "Tajikistan",
  TK: "Tokelau",
  TL: "Timor-Leste",
  TM: "Turkmenistan",
  TN: "Tunisia",
  TO: "Tonga",
  TR: "Turkiye",
  TT: "Trinidad and Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "Tanzania",
  UA: "Ukraine",
  UG: "Uganda",
  UM: "U.S. Outlying Islands",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VA: "Vatican City",
  VC: "St. Vincent and Grenadines",
  VE: "Venezuela",
  VG: "British Virgin Islands",
  VI: "U.S. Virgin Islands",
  VN: "Vietnam",
  VU: "Vanuatu",
  WF: "Wallis and Futuna",
  WS: "Samoa",
  XK: "Kosovo",
  YE: "Yemen",
  YT: "Mayotte",
  ZA: "South Africa",
  ZM: "Zambia",
  ZW: "Zimbabwe"
};
const countryOptions = buildCountryOptions();

type ManualTravelEntry = {
  startDate: string;
  endDate: string;
  countryCode: string;
  countryName: string;
};

type DayLocationEntry = {
  originalDate: string;
  date: string;
  countryCode: string;
  countryName: string;
};

type CalendarCell = {
  date: Date;
  iso: string;
  isBlank: false;
} | {
  key: string;
  isBlank: true;
};

export function CalendarScreen() {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { monthRecords, selectedDate, setSelectedDate, settings, addManualEntry, updateDayEntry } = useAppStore();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getPalette(isDark);
  const [month, setMonth] = useState(() => startOfMonth(parseISO(selectedDate)));
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [openManualEntryAfterMenuClose, setOpenManualEntryAfterMenuClose] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const selectedDateInMonth = isSameMonth(parseISO(selectedDate), month) ? selectedDate : todayIso;
  const recordsByDate = useMemo(() => new Map(monthRecords.map((record) => [record.date, record])), [monthRecords]);
  const cells = useMemo(() => buildCalendarCells(month), [month]);
  const monthSummary = useMemo(() => buildMonthSummary(monthRecords, month), [monthRecords, month]);
  const editingRecord = editingDate ? recordsByDate.get(editingDate) : undefined;

  async function selectDay(iso: string) {
    await setSelectedDate(iso);
    setEditingDate(iso);
  }

  async function shiftMonth(direction: -1 | 1) {
    const nextMonth = direction === 1 ? addMonths(month, 1) : subMonths(month, 1);
    const nextIso = format(nextMonth, "yyyy-MM-dd");
    setMonth(nextMonth);
    await setSelectedDate(nextIso);
  }

  async function changeMonth(nextMonth: Date) {
    const start = startOfMonth(nextMonth);
    setMonth(start);
    await setSelectedDate(format(start, "yyyy-MM-dd"));
  }

  function openManualEntry() {
    setOpenManualEntryAfterMenuClose(true);
    setIsAddMenuOpen(false);
  }

  function openPhotoScanner() {
    setOpenManualEntryAfterMenuClose(false);
    setIsAddMenuOpen(false);
  }

  const handleAddMenuClose = useCallback(() => {
    setIsAddMenuOpen(false);
    setOpenManualEntryAfterMenuClose(false);
  }, []);

  const handleAddMenuClosed = useCallback(() => {
    if (!openManualEntryAfterMenuClose) return;
    setOpenManualEntryAfterMenuClose(false);
    setIsManualEntryOpen(true);
  }, [openManualEntryAfterMenuClose]);

  async function insertManualEntry(entry: ManualTravelEntry) {
    await addManualEntry(entry);
    setMonth(startOfMonth(parseISO(entry.startDate)));
  }

  async function updateDay(entry: DayLocationEntry) {
    await updateDayEntry(entry);
    setMonth(startOfMonth(parseISO(entry.date)));
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            backgroundColor: palette.screen,
            paddingBottom: Math.max(insets.bottom, 10) + 116,
            paddingTop: 20
          }
        ]}
        style={{ backgroundColor: palette.screen }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topActionRow}>
            <Text className="text-3xl font-extrabold" style={[styles.title, { color: palette.foreground }]}>
              History
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add travel entry"
              accessibilityState={isAddMenuOpen ? { expanded: true } : undefined}
              style={[styles.addButton, { backgroundColor: palette.addButton, borderColor: palette.addBorder, shadowColor: palette.addShadow }]}
              onPress={() => setIsAddMenuOpen(true)}
            >
              <Plus size={24} color={palette.foreground} strokeWidth={iconStrokeWidth} />
            </Pressable>
          </View>

        <View style={styles.monthRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change month and year"
            hitSlop={8}
            style={styles.monthLabel}
            onPress={() => setIsMonthPickerOpen(true)}
          >
            <Text className="text-lg font-bold" style={[styles.monthText, { color: palette.foreground }]}>
              {format(month, "MMMM yyyy")}
            </Text>
            <ChevronRight size={22} color={palette.accent} strokeWidth={iconStrokeWidth} />
          </Pressable>
          <View style={styles.monthControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={12} style={styles.monthButton} onPress={() => void shiftMonth(-1)}>
              <ChevronLeft size={31} color={palette.accent} strokeWidth={iconStrokeWidth} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={12} style={styles.monthButton} onPress={() => void shiftMonth(1)}>
              <ChevronRight size={31} color={palette.accent} strokeWidth={iconStrokeWidth} />
            </Pressable>
          </View>
        </View>

        <MonthSummaryPanel palette={palette} summary={monthSummary} />

        <View style={styles.weekdayRow}>
          {weekdays.map((day) => (
            <Text key={day} className="text-xs font-bold" style={[styles.weekdayText, { color: palette.weekday }]}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {chunk(cells, 7).map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((cell) => {
                if (cell.isBlank) {
                  return <View key={cell.key} style={styles.dayCell} />;
                }

                const record = recordsByDate.get(cell.iso);
                const isSelected = cell.iso === selectedDateInMonth;
                const isFuture = isAfter(cell.date, parseISO(todayIso));
                const countryCode = record?.primary_country_code ?? null;

                return (
                  <Pressable
                    key={cell.iso}
                    accessibilityRole="button"
                    accessibilityLabel={`${format(cell.date, "MMMM d")}${countryCode ? `, ${countryCode}` : ""}`}
                    style={styles.dayCell}
                    onPress={() => void selectDay(cell.iso)}
                  >
                    <Text
                      className="text-lg"
                      style={[
                        styles.dayNumber,
                        {
                          color: isSelected ? palette.accent : isFuture ? palette.foreground : palette.foreground,
                          opacity: isFuture && !countryCode ? 0.96 : 1
                        }
                      ]}
                    >
                      {format(cell.date, "d")}
                    </Text>
                    {countryCode ? (
                      <Text className="text-lg" style={styles.flagText}>
                        {flagForCountry(countryCode)}
                      </Text>
                    ) : (
                      <View style={styles.flagPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
        </View>
      </ScrollView>

      <CalendarAddMenu
        palette={palette}
        visible={isAddMenuOpen}
        onClose={handleAddMenuClose}
        onClosed={handleAddMenuClosed}
        onManualEntry={openManualEntry}
        onPhotoScanner={openPhotoScanner}
      />
      <MonthYearPicker
        month={month}
        palette={palette}
        visible={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        onConfirm={(nextMonth) => {
          setIsMonthPickerOpen(false);
          void changeMonth(nextMonth);
        }}
      />
      <ManualEntryDrawer
        initialDate={selectedDateInMonth}
        palette={palette}
        visible={isManualEntryOpen}
        onClose={() => setIsManualEntryOpen(false)}
        onConfirm={async (entry) => {
          await insertManualEntry(entry);
          setIsManualEntryOpen(false);
        }}
      />
      <DayEditDrawer
        initialCountryInput={editingRecord?.primary_country_name ?? editingRecord?.primary_country_code ?? ""}
        initialDate={editingDate ?? selectedDateInMonth}
        palette={palette}
        visible={Boolean(editingDate)}
        onClose={() => setEditingDate(null)}
        onConfirm={async (entry) => {
          await updateDay(entry);
          setEditingDate(null);
        }}
      />
    </>
  );
}

type MonthSummary = {
  abroadDays: number;
  indiaDays: number;
  manualDays: number;
  pendingDays: number;
  recordedDays: number;
  totalDays: number;
  travelDays: number;
  untrackedDays: number;
  topCountries: Array<{ code: string; name: string; days: number }>;
};

type MonthSummaryRecord = {
  date: string;
  primary_country_code: string | null;
  primary_country_name: string | null;
  is_travel_day: number;
  is_pending_validation: number;
  is_manual_override: number;
};

function MonthSummaryPanel({ palette, summary }: { palette: ReturnType<typeof getPalette>; summary: MonthSummary }) {
  const countrySummary =
    summary.topCountries.length > 0
      ? summary.topCountries.map((country) => `${flagForCountry(country.code)} ${country.days}d`).join("  ")
      : "No countries tracked";
  const statusSummary = [summary.manualDays > 0 ? `${summary.manualDays} manual` : null, summary.untrackedDays > 0 ? `${summary.untrackedDays} untracked` : null]
    .filter(Boolean)
    .join(" / ");

  return (
    <View style={[styles.monthSummaryPanel, { backgroundColor: palette.card, borderColor: palette.inputBorder }]}>
      <View style={styles.monthSummaryHeader}>
        <Text className="text-sm font-extrabold" style={{ color: palette.foreground }}>
          Month Summary
        </Text>
        <Text className="text-xs font-semibold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.muted, flexShrink: 0 }}>
          {summary.recordedDays}/{summary.totalDays} days tracked
        </Text>
      </View>

      <View style={styles.monthSummaryMetrics}>
        <MonthSummaryMetric label="India" value={summary.indiaDays} palette={palette} />
        <MonthSummaryMetric label="Abroad" value={summary.abroadDays} palette={palette} />
        <MonthSummaryMetric label="Travel" value={summary.travelDays} palette={palette} />
        <MonthSummaryMetric label="Pending" value={summary.pendingDays} palette={palette} />
      </View>

      <View style={[styles.monthSummaryFooter, { borderTopColor: palette.inputBorder }]}>
        <Text className="text-xs font-semibold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.muted, flex: 1, minWidth: 0 }}>
          {countrySummary}
        </Text>
        {statusSummary ? (
          <Text className="text-xs font-semibold" style={{ color: palette.weekday }}>
            {statusSummary}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MonthSummaryMetric({ label, value, palette }: { label: string; value: number; palette: ReturnType<typeof getPalette> }) {
  return (
    <View style={[styles.monthSummaryMetric, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder }]}>
      <Text className="text-lg font-extrabold" style={{ color: palette.foreground }}>
        {value}
      </Text>
      <Text className="text-[10px] font-bold" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.muted }}>
        {label}
      </Text>
    </View>
  );
}

function buildMonthSummary(records: MonthSummaryRecord[], month: Date): MonthSummary {
  const totalDays = endOfMonth(month).getDate();
  const recordedDates = new Set<string>();
  const countryTotals = new Map<string, { code: string; name: string; days: number }>();
  let indiaDays = 0;
  let abroadDays = 0;
  let travelDays = 0;
  let pendingDays = 0;
  let manualDays = 0;

  for (const record of records) {
    if (!isSameMonth(parseISO(record.date), month)) continue;

    recordedDates.add(record.date);
    if (record.is_travel_day) travelDays += 1;
    if (record.is_pending_validation) pendingDays += 1;
    if (record.is_manual_override) manualDays += 1;

    const code = record.primary_country_code?.toUpperCase();
    if (!code) continue;

    if (code === "IN") {
      indiaDays += 1;
    } else {
      abroadDays += 1;
    }

    const current = countryTotals.get(code) ?? {
      code,
      name: record.primary_country_name ?? code,
      days: 0
    };
    current.days += 1;
    countryTotals.set(code, current);
  }

  const recordedDays = Math.min(recordedDates.size, totalDays);
  const topCountries = [...countryTotals.values()]
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name))
    .slice(0, 3);

  return {
    abroadDays,
    indiaDays,
    manualDays,
    pendingDays,
    recordedDays,
    totalDays,
    travelDays,
    untrackedDays: Math.max(0, totalDays - recordedDays),
    topCountries
  };
}

function MonthYearPicker({
  month,
  palette,
  visible,
  onClose,
  onConfirm
}: {
  month: Date;
  palette: ReturnType<typeof getPalette>;
  visible: boolean;
  onClose: () => void;
  onConfirm: (month: Date) => void;
}) {
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const [draftMonth, setDraftMonth] = useState(month.getMonth());
  const [draftYear, setDraftYear] = useState(month.getFullYear());
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setDraftMonth(month.getMonth());
      setDraftYear(month.getFullYear());
      setIsRendered(true);
      dragY.value = 0;
      progress.value = withSpring(1, {
        damping: 24,
        mass: 0.85,
        stiffness: 190
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 180,
        easing: ReanimatedEasing.in(ReanimatedEasing.quad)
      },
      (finished) => {
        if (finished) {
          dragY.value = 0;
          runOnJS(setIsRendered)(false);
        }
      }
    );
  }, [dragY, month, progress, visible]);

  const drawerGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-18, 18])
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > 88 || event.velocityY > 780;
          if (shouldClose) {
            runOnJS(onClose)();
            return;
          }

          dragY.value = withSpring(0, {
            damping: 22,
            mass: 0.8,
            stiffness: 220
          });
        }),
    [dragY, onClose]
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(dragY.value, [0, 220], [1, 0.24], Extrapolation.CLAMP)
  }));

  const backdropBlurStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(dragY.value, [0, 220], [1, 0], Extrapolation.CLAMP)
  }));

  const drawerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.62, 1], [0, 0.82, 1]) * interpolate(dragY.value, [0, 220], [1, 0.32], Extrapolation.CLAMP)
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [360, 0]) + dragY.value },
      { scale: interpolate(dragY.value, [0, 220], [1, 0.986], Extrapolation.CLAMP) }
    ]
  }));

  function updateYear(value: number) {
    setDraftYear(Math.max(1900, Math.min(2100, value)));
  }

  function confirmSelection() {
    onConfirm(new Date(draftYear, draftMonth, 1));
  }

  if (!isRendered) return null;

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <FadingBlurLayer tint={palette.blurTint} intensity={18} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} blurStyle={backdropBlurStyle} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.noPointerEvents, backdropStyle]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.drawerBackdrop }]} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.monthDrawer,
            {
              borderColor: palette.glassBorder,
              paddingBottom: Math.max(insets.bottom, 12),
              shadowColor: palette.glassShadow
            },
            drawerStyle
          ]}
        >
          <FadingBlurLayer tint={palette.blurTint} intensity={72} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} blurStyle={drawerBlurStyle} />
          <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.menuGlassFill }]} />
          <View style={[styles.glassHighlight, styles.noPointerEvents, { backgroundColor: palette.glassHighlight }]} />
          <View style={[styles.monthDrawerRim, styles.noPointerEvents, { borderColor: palette.glassRim }]} />
          <GestureDetector gesture={drawerGesture}>
            <Animated.View style={styles.drawerHandleTouchArea}>
              <View style={[styles.drawerHandle, { backgroundColor: palette.glassBorder }]} />
            </Animated.View>
          </GestureDetector>

          <View style={styles.monthDrawerContent}>
            <View style={styles.monthPickerHeader}>
              <CalendarDays size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              <Text className="text-lg font-extrabold" style={{ color: palette.foreground }}>
                Choose Month
              </Text>
            </View>

            <View style={[styles.yearPicker, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder }]}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous year" style={styles.pickerIconButton} onPress={() => updateYear(draftYear - 1)}>
                <ChevronLeft size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              </Pressable>
              <Text className="text-lg font-extrabold" style={{ color: palette.foreground }}>
                {draftYear}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Next year" style={styles.pickerIconButton} onPress={() => updateYear(draftYear + 1)}>
                <ChevronRight size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              </Pressable>
            </View>

            <View style={styles.monthGrid}>
              {monthNames.map((name, index) => {
                const selected = draftMonth === index;
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${name} ${draftYear}`}
                    style={[
                      styles.monthOption,
                      {
                        backgroundColor: selected ? palette.selectedFill : palette.chipFill,
                        borderColor: selected ? palette.selectedBorder : palette.inputBorder
                      }
                    ]}
                    onPress={() => setDraftMonth(index)}
                  >
                    <Text className="text-sm font-bold" style={{ color: selected ? palette.selectedForeground : palette.foreground }}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.drawerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel month selection" style={[styles.secondaryAction, { backgroundColor: palette.chipFill, borderColor: palette.inputBorder }]} onPress={onClose}>
                <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Confirm month selection" style={[styles.primaryAction, { backgroundColor: palette.foreground }]} onPress={confirmSelection}>
                <Check size={18} color={palette.screen} strokeWidth={iconStrokeWidth} />
                <Text className="text-sm font-bold" style={{ color: palette.screen }}>
                  Confirm
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ManualEntryDrawer({
  initialDate,
  palette,
  visible,
  onClose,
  onConfirm
}: {
  initialDate: string;
  palette: ReturnType<typeof getPalette>;
  visible: boolean;
  onClose: () => void;
  onConfirm: (entry: ManualTravelEntry) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const [draftYear, setDraftYear] = useState(Number(initialDate.slice(0, 4)));
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [pickerMonth, setPickerMonth] = useState(() => startOfMonth(parseISO(initialDate)));
  const [activeDateField, setActiveDateField] = useState<"start" | "end">("start");
  const [countryInput, setCountryInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setDraftYear(Number(initialDate.slice(0, 4)));
      setStartDate(initialDate);
      setEndDate(initialDate);
      setPickerMonth(startOfMonth(parseISO(initialDate)));
      setActiveDateField("start");
      setCountryInput("");
      setErrorMessage(null);
      setIsSaving(false);
      setIsRendered(true);
      dragY.value = 0;
      progress.value = withSpring(1, {
        damping: 24,
        mass: 0.85,
        stiffness: 190
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 190,
        easing: ReanimatedEasing.in(ReanimatedEasing.quad)
      },
      (finished) => {
        if (finished) {
          dragY.value = 0;
          runOnJS(setIsRendered)(false);
        }
      }
    );
  }, [dragY, initialDate, progress, visible]);

  const drawerGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-18, 18])
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > 104 || event.velocityY > 820;
          if (shouldClose) {
            runOnJS(onClose)();
            return;
          }

          dragY.value = withSpring(0, {
            damping: 22,
            mass: 0.8,
            stiffness: 220
          });
        }),
    [dragY, onClose]
  );

  const matchingCountryOptions = useMemo(() => {
    const normalizedInput = normalizeSearchText(countryInput);
    const matches = normalizedInput
      ? countryOptions.filter((country) => {
          const normalizedName = normalizeSearchText(country.name);
          return normalizedName.includes(normalizedInput) || country.code.toLowerCase().startsWith(normalizedInput);
        })
      : countryOptions.slice(0, 12);

    return matches.slice(0, 12);
  }, [countryInput]);

  const selectedCountry = resolveCountry(countryInput);
  const pickerCells = useMemo(() => buildCalendarCells(pickerMonth), [pickerMonth]);
  const canGoToPreviousPickerMonth = pickerMonth.getFullYear() > draftYear || pickerMonth.getMonth() > 0;
  const canGoToNextPickerMonth = pickerMonth.getFullYear() < draftYear || pickerMonth.getMonth() < 11;

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(dragY.value, [0, 260], [1, 0.2], Extrapolation.CLAMP)
  }));

  const backdropBlurStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(dragY.value, [0, 260], [1, 0], Extrapolation.CLAMP)
  }));

  const drawerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.62, 1], [0, 0.82, 1]) * interpolate(dragY.value, [0, 260], [1, 0.32], Extrapolation.CLAMP)
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [460, 0]) + dragY.value },
      { scale: interpolate(dragY.value, [0, 260], [1, 0.984], Extrapolation.CLAMP) }
    ]
  }));

  function updateDraftYear(value: number) {
    const nextYear = Math.max(1900, Math.min(2100, value));
    const nextYearText = String(nextYear);
    const nextStartDate = replaceIsoYear(startDate, nextYearText);
    const nextEndDate = replaceIsoYear(endDate, nextYearText);

    setDraftYear(nextYear);
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setPickerMonth(startOfMonth(parseISO(activeDateField === "start" ? nextStartDate : nextEndDate)));
  }

  function shiftPickerMonth(direction: -1 | 1) {
    const nextMonth = direction === 1 ? addMonths(pickerMonth, 1) : subMonths(pickerMonth, 1);
    if (nextMonth.getFullYear() !== draftYear) return;
    setPickerMonth(nextMonth);
  }

  function selectPickerDate(iso: string) {
    if (activeDateField === "start") {
      setStartDate(iso);
      if (iso > endDate) setEndDate(iso);
      setActiveDateField("end");
      return;
    }

    setEndDate(iso);
    if (iso < startDate) setStartDate(iso);
  }

  async function submit() {
    const result = buildManualEntry(String(draftYear), startDate, endDate, countryInput);
    if ("message" in result) {
      setErrorMessage(result.message);
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onConfirm(result.entry);
    } catch (error) {
      setIsSaving(false);
      setErrorMessage(error instanceof Error ? error.message : "Could not insert manual entry.");
    }
  }

  if (!isRendered) return null;

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
        <FadingBlurLayer tint={palette.blurTint} intensity={18} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} blurStyle={backdropBlurStyle} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.noPointerEvents, backdropStyle]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.drawerBackdrop }]} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.manualDrawer,
            {
              borderColor: palette.glassBorder,
              paddingBottom: Math.max(insets.bottom, 12),
              shadowColor: palette.glassShadow
            },
            drawerStyle
          ]}
        >
          <FadingBlurLayer tint={palette.blurTint} intensity={72} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} blurStyle={drawerBlurStyle} />
          <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.menuGlassFill }]} />
          <View style={[styles.glassHighlight, styles.noPointerEvents, { backgroundColor: palette.glassHighlight }]} />
          <View style={[styles.manualDrawerRim, styles.noPointerEvents, { borderColor: palette.glassRim }]} />
          <GestureDetector gesture={drawerGesture}>
            <Animated.View style={styles.drawerHandleTouchArea}>
              <View style={[styles.drawerHandle, { backgroundColor: palette.glassBorder }]} />
            </Animated.View>
          </GestureDetector>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.manualDrawerContent}>
            <View style={styles.drawerHeaderRow}>
              <View style={[styles.drawerIcon, { backgroundColor: palette.card }]}>
                <PencilLine size={20} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              </View>
              <View style={styles.drawerHeaderText}>
                <Text className="text-lg font-extrabold" style={{ color: palette.foreground }}>
                  Manual Entry
                </Text>
                <Text className="text-xs" style={{ color: palette.muted }}>
                  History
                </Text>
              </View>
            </View>

            <View style={styles.manualForm}>
              <View style={styles.fieldGroup}>
                <Text className="text-xs font-bold" style={{ color: palette.muted }}>
                  Year
                </Text>
                <View style={[styles.yearPicker, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder }]}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous year" style={styles.pickerIconButton} onPress={() => updateDraftYear(draftYear - 1)}>
                    <ChevronLeft size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
                  </Pressable>
                  <Text className="text-lg font-extrabold" style={{ color: palette.foreground }}>
                    {draftYear}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next year" style={styles.pickerIconButton} onPress={() => updateDraftYear(draftYear + 1)}>
                    <ChevronRight size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.dateRangePicker}>
                <DateBoundaryButton active={activeDateField === "start"} label="Start" iso={startDate} palette={palette} onPress={() => setActiveDateField("start")} />
                <DateBoundaryButton active={activeDateField === "end"} label="End" iso={endDate} palette={palette} onPress={() => setActiveDateField("end")} />
              </View>

              <View style={[styles.calendarPicker, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder }]}>
                <View style={styles.calendarPickerHeader}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={!canGoToPreviousPickerMonth} style={[styles.pickerIconButton, !canGoToPreviousPickerMonth && styles.disabledControl]} onPress={() => shiftPickerMonth(-1)}>
                    <ChevronLeft size={21} color={palette.foreground} strokeWidth={iconStrokeWidth} />
                  </Pressable>
                  <View style={styles.calendarPickerTitle}>
                    <CalendarDays size={16} color={palette.muted} strokeWidth={iconStrokeWidth} />
                    <Text className="text-sm font-extrabold" style={{ color: palette.foreground }}>
                      {format(pickerMonth, "MMMM yyyy")}
                    </Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={!canGoToNextPickerMonth} style={[styles.pickerIconButton, !canGoToNextPickerMonth && styles.disabledControl]} onPress={() => shiftPickerMonth(1)}>
                    <ChevronRight size={21} color={palette.foreground} strokeWidth={iconStrokeWidth} />
                  </Pressable>
                </View>

                <View style={styles.pickerWeekdayRow}>
                  {weekdays.map((day) => (
                    <Text key={day} className="text-[10px] font-bold" style={[styles.pickerWeekdayText, { color: palette.weekday }]}>
                      {day.slice(0, 1)}
                    </Text>
                  ))}
                </View>

                <View style={styles.pickerGrid}>
                  {chunk(pickerCells, 7).map((week, weekIndex) => (
                    <View key={`picker-week-${weekIndex}`} style={styles.pickerWeekRow}>
                      {week.map((cell) => {
                        if (cell.isBlank) {
                          return <View key={cell.key} style={styles.pickerDayBlankCell} />;
                        }

                        const inRange = cell.iso >= startDate && cell.iso <= endDate;
                        const isStart = cell.iso === startDate;
                        const isEnd = cell.iso === endDate;
                        const isSelected = isStart || isEnd;

                        return (
                          <Pressable
                            key={cell.iso}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${format(cell.date, "MMMM d, yyyy")}`}
                            style={[
                              styles.pickerDayCell,
                              {
                                backgroundColor: isSelected ? palette.selectedFill : inRange ? palette.chipFill : "transparent",
                                borderColor: isSelected ? palette.selectedBorder : "transparent"
                              }
                            ]}
                            onPress={() => selectPickerDate(cell.iso)}
                          >
                            <Text className="text-xs font-bold" style={{ color: isSelected ? palette.selectedForeground : palette.foreground }}>
                              {format(cell.date, "d")}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text className="text-xs font-bold" style={{ color: palette.muted }}>
                  Country
                </Text>
                <View style={[styles.countryInputShell, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder }]}>
                  <Globe2 size={18} color={palette.muted} strokeWidth={iconStrokeWidth} />
                  <TextInput
                    accessibilityLabel="Manual entry country"
                    autoCapitalize="words"
                    placeholder="Country name or code"
                    placeholderTextColor={palette.placeholder}
                    style={[styles.countryInput, { color: palette.foreground }]}
                    value={countryInput}
                    onChangeText={(value) => {
                      setCountryInput(value);
                      setErrorMessage(null);
                    }}
                  />
                </View>
              </View>

              <View style={styles.countryChips}>
                {matchingCountryOptions.map((country) => {
                  const selected = selectedCountry?.code === country.code;
                  return (
                    <Pressable
                      key={country.code}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${country.name} ${country.code}`}
                      style={[
                        styles.countryChip,
                        {
                          backgroundColor: selected ? palette.selectedFill : palette.chipFill,
                          borderColor: selected ? palette.selectedBorder : palette.inputBorder
                        }
                      ]}
                      onPress={() => {
                        setCountryInput(country.name);
                        setErrorMessage(null);
                      }}
                    >
                      <Text className="text-xs font-bold" style={{ color: selected ? palette.selectedForeground : palette.foreground }} numberOfLines={1}>
                        {country.name} ({country.code})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: palette.errorFill, borderColor: palette.errorBorder }]}>
                  <Text className="text-xs font-bold" style={{ color: palette.errorText }}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.drawerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel manual entry" disabled={isSaving} style={[styles.secondaryAction, { backgroundColor: palette.chipFill, borderColor: palette.inputBorder }]} onPress={onClose}>
                <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Confirm manual entry" disabled={isSaving} style={[styles.primaryAction, { backgroundColor: palette.foreground, opacity: isSaving ? 0.65 : 1 }]} onPress={() => void submit()}>
                <Check size={18} color={palette.screen} strokeWidth={iconStrokeWidth} />
                <Text className="text-sm font-bold" style={{ color: palette.screen }}>
                  {isSaving ? "Inserting" : "Confirm"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DayEditDrawer({
  initialCountryInput,
  initialDate,
  palette,
  visible,
  onClose,
  onConfirm
}: {
  initialCountryInput: string;
  initialDate: string;
  palette: ReturnType<typeof getPalette>;
  visible: boolean;
  onClose: () => void;
  onConfirm: (entry: DayLocationEntry) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const [draftDate, setDraftDate] = useState(initialDate);
  const [countryInput, setCountryInput] = useState(initialCountryInput);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setDraftDate(initialDate);
      setCountryInput(initialCountryInput);
      setErrorMessage(null);
      setIsSaving(false);
      setIsRendered(true);
      dragY.value = 0;
      progress.value = withSpring(1, {
        damping: 24,
        mass: 0.85,
        stiffness: 190
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 190,
        easing: ReanimatedEasing.in(ReanimatedEasing.quad)
      },
      (finished) => {
        if (finished) {
          dragY.value = 0;
          runOnJS(setIsRendered)(false);
        }
      }
    );
  }, [dragY, initialCountryInput, initialDate, progress, visible]);

  const drawerGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-18, 18])
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const shouldClose = event.translationY > 104 || event.velocityY > 820;
          if (shouldClose) {
            runOnJS(onClose)();
            return;
          }

          dragY.value = withSpring(0, {
            damping: 22,
            mass: 0.8,
            stiffness: 220
          });
        }),
    [dragY, onClose]
  );

  const matchingCountryOptions = useMemo(() => {
    const normalizedInput = normalizeSearchText(countryInput);
    const matches = normalizedInput
      ? countryOptions.filter((country) => {
          const normalizedName = normalizeSearchText(country.name);
          return normalizedName.includes(normalizedInput) || country.code.toLowerCase().startsWith(normalizedInput);
        })
      : countryOptions.slice(0, 12);

    return matches.slice(0, 12);
  }, [countryInput]);

  const selectedCountry = resolveCountry(countryInput);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(dragY.value, [0, 260], [1, 0.2], Extrapolation.CLAMP)
  }));

  const backdropBlurStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(dragY.value, [0, 260], [1, 0], Extrapolation.CLAMP)
  }));

  const drawerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.62, 1], [0, 0.82, 1]) * interpolate(dragY.value, [0, 260], [1, 0.32], Extrapolation.CLAMP)
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [460, 0]) + dragY.value },
      { scale: interpolate(dragY.value, [0, 260], [1, 0.984], Extrapolation.CLAMP) }
    ]
  }));

  async function submit() {
    const result = buildDayLocationEntry(initialDate, draftDate, countryInput);
    if ("message" in result) {
      setErrorMessage(result.message);
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onConfirm(result.entry);
    } catch (error) {
      setIsSaving(false);
      setErrorMessage(error instanceof Error ? error.message : "Could not update this day.");
    }
  }

  if (!isRendered) return null;

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
        <FadingBlurLayer tint={palette.blurTint} intensity={18} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} blurStyle={backdropBlurStyle} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.noPointerEvents, backdropStyle]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.drawerBackdrop }]} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.manualDrawer,
            {
              borderColor: palette.glassBorder,
              paddingBottom: Math.max(insets.bottom, 12),
              shadowColor: palette.glassShadow
            },
            drawerStyle
          ]}
        >
          <FadingBlurLayer tint={palette.blurTint} intensity={72} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} blurStyle={drawerBlurStyle} />
          <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.menuGlassFill }]} />
          <View style={[styles.glassHighlight, styles.noPointerEvents, { backgroundColor: palette.glassHighlight }]} />
          <View style={[styles.manualDrawerRim, styles.noPointerEvents, { borderColor: palette.glassRim }]} />
          <GestureDetector gesture={drawerGesture}>
            <Animated.View style={styles.drawerHandleTouchArea}>
              <View style={[styles.drawerHandle, { backgroundColor: palette.glassBorder }]} />
            </Animated.View>
          </GestureDetector>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.manualDrawerContent}>
            <View style={styles.drawerHeaderRow}>
              <View style={[styles.drawerIcon, { backgroundColor: palette.card }]}>
                <PencilLine size={20} color={palette.foreground} strokeWidth={iconStrokeWidth} />
              </View>
              <View style={styles.drawerHeaderText}>
                <Text className="text-lg font-extrabold" style={{ color: palette.foreground }}>
                  Edit Day
                </Text>
                <Text className="text-xs" style={{ color: palette.muted }}>
                  Final location
                </Text>
              </View>
            </View>

            <View style={styles.manualForm}>
              <View style={styles.fieldGroup}>
                <Text className="text-xs font-bold" style={{ color: palette.muted }}>
                  Date
                </Text>
                <TextInput
                  accessibilityLabel="Final location date"
                  autoCapitalize="none"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.placeholder}
                  style={[styles.manualInput, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder, color: palette.foreground }]}
                  value={draftDate}
                  onChangeText={(value) => {
                    setDraftDate(value);
                    setErrorMessage(null);
                  }}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text className="text-xs font-bold" style={{ color: palette.muted }}>
                  Country
                </Text>
                <View style={[styles.countryInputShell, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder }]}>
                  <Globe2 size={18} color={palette.muted} strokeWidth={iconStrokeWidth} />
                  <TextInput
                    accessibilityLabel="Final location country"
                    autoCapitalize="words"
                    placeholder="Country name or code"
                    placeholderTextColor={palette.placeholder}
                    style={[styles.countryInput, { color: palette.foreground }]}
                    value={countryInput}
                    onChangeText={(value) => {
                      setCountryInput(value);
                      setErrorMessage(null);
                    }}
                  />
                </View>
              </View>

              <View style={styles.countryChips}>
                {matchingCountryOptions.map((country) => {
                  const selected = selectedCountry?.code === country.code;
                  return (
                    <Pressable
                      key={country.code}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${country.name} ${country.code}`}
                      style={[
                        styles.countryChip,
                        {
                          backgroundColor: selected ? palette.selectedFill : palette.chipFill,
                          borderColor: selected ? palette.selectedBorder : palette.inputBorder
                        }
                      ]}
                      onPress={() => {
                        setCountryInput(country.name);
                        setErrorMessage(null);
                      }}
                    >
                      <Text className="text-xs font-bold" style={{ color: selected ? palette.selectedForeground : palette.foreground }} numberOfLines={1}>
                        {country.name} ({country.code})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: palette.errorFill, borderColor: palette.errorBorder }]}>
                  <Text className="text-xs font-bold" style={{ color: palette.errorText }}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.drawerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel day edit" disabled={isSaving} style={[styles.secondaryAction, { backgroundColor: palette.chipFill, borderColor: palette.inputBorder }]} onPress={onClose}>
                <Text className="text-sm font-bold" style={{ color: palette.foreground }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Update day" disabled={isSaving} style={[styles.primaryAction, { backgroundColor: palette.foreground, opacity: isSaving ? 0.65 : 1 }]} onPress={() => void submit()}>
                <Check size={18} color={palette.screen} strokeWidth={iconStrokeWidth} />
                <Text className="text-sm font-bold" style={{ color: palette.screen }}>
                  {isSaving ? "Updating" : "Update"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DateBoundaryButton({
  active,
  label,
  iso,
  palette,
  onPress
}: {
  active: boolean;
  label: string;
  iso: string;
  palette: ReturnType<typeof getPalette>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pick ${label.toLowerCase()} date`}
      style={[
        styles.dateBoundaryButton,
        {
          backgroundColor: active ? palette.selectedFill : palette.inputFill,
          borderColor: active ? palette.selectedBorder : palette.inputBorder
        }
      ]}
      onPress={onPress}
    >
      <Text className="text-xs font-bold" style={{ color: active ? palette.selectedMutedForeground : palette.muted }}>
        {label}
      </Text>
      <Text className="text-sm font-extrabold" style={{ color: active ? palette.selectedForeground : palette.foreground }} numberOfLines={1}>
        {format(parseISO(iso), "MMM d")}
      </Text>
    </Pressable>
  );
}

function CalendarAddMenu({
  palette,
  visible,
  onClose,
  onClosed,
  onManualEntry,
  onPhotoScanner
}: {
  palette: ReturnType<typeof getPalette>;
  visible: boolean;
  onClose: () => void;
  onClosed: () => void;
  onManualEntry: () => void;
  onPhotoScanner: () => void;
}) {
  const [isRendered, setIsRendered] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      progress.value = withTiming(1, {
        duration: 210,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: 150,
        easing: ReanimatedEasing.in(ReanimatedEasing.quad)
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
          runOnJS(onClosed)();
        }
      }
    );
  }, [onClosed, progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1])
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-10, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.96, 1]) }
    ]
  }));

  if (!isRendered) return null;

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.noPointerEvents, backdropStyle]}>
          <GlassBlurLayer tint={palette.blurTint} intensity={18} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.glassBackdrop }]} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.addMenu,
            {
              borderColor: palette.glassBorder,
              shadowColor: palette.glassShadow
            },
            menuStyle
          ]}
        >
          <GlassBlurLayer tint={palette.blurTint} intensity={72} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} />
          <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.menuGlassFill }]} />
          <View style={[styles.glassHighlight, styles.noPointerEvents, { backgroundColor: palette.glassHighlight }]} />
          <View style={[styles.quickMenuRim, styles.noPointerEvents, { borderColor: palette.glassRim }]} />
          <View style={styles.addMenuContent}>
            <AddMenuAction icon="manual" label="Manual Entry" palette={palette} onPress={onManualEntry} />
            <AddMenuAction icon="photos" label="Scan Photos" palette={palette} onPress={onPhotoScanner} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function GlassBlurLayer({ tint, intensity, style }: { tint: ReturnType<typeof getPalette>["blurTint"]; intensity: number; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === "web") {
    return <BlurView tint={tint} intensity={intensity} style={style} />;
  }

  return <View style={[style, { backgroundColor: tint === "dark" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.08)" }]} />;
}

function FadingBlurLayer({
  blurStyle,
  intensity,
  style,
  tint
}: {
  blurStyle: StyleProp<ViewStyle>;
  intensity: number;
  style?: StyleProp<ViewStyle>;
  tint: ReturnType<typeof getPalette>["blurTint"];
}) {
  return (
    <Animated.View style={[style, blurStyle]}>
      <GlassBlurLayer tint={tint} intensity={intensity} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function AddMenuAction({ icon, label, onPress, palette }: { icon: "manual" | "photos"; label: string; onPress: () => void; palette: ReturnType<typeof getPalette> }) {
  const Icon = icon === "manual" ? PencilLine : Images;

  return (
    <Pressable accessibilityRole="menuitem" accessibilityLabel={label} style={styles.addMenuAction} onPress={onPress}>
      <Icon size={28} color={palette.foreground} strokeWidth={iconStrokeWidth} />
      <Text className="flex-1 text-lg" numberOfLines={1} adjustsFontSizeToFit style={{ color: palette.foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

function buildCountryOptions(): CountryOption[] {
  const priorityCodes = new Set<string>(priorityCountryCodes);
  const byCode = new Map<string, CountryOption>(isoCountryCodes.map((code) => [code, { code, name: displayCountryName(code) }]));
  const priorityOptions = priorityCountryCodes.map((code) => byCode.get(code)).filter((option): option is CountryOption => Boolean(option));
  const remainingOptions = [...byCode.values()]
    .filter((option) => !priorityCodes.has(option.code))
    .sort((first, second) => first.name.localeCompare(second.name) || first.code.localeCompare(second.code));

  return [...priorityOptions, ...remainingOptions];
}

function buildManualEntry(year: string, startDate: string, endDate: string, countryInput: string): { entry: ManualTravelEntry } | { message: string } {
  if (!/^\d{4}$/.test(year)) return { message: "Enter a 4-digit year." };
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) return { message: "Enter dates as YYYY-MM-DD." };
  if (startDate.slice(0, 4) !== year || endDate.slice(0, 4) !== year) return { message: "Start and end dates must use the selected year." };
  if (startDate > endDate) return { message: "End date must be on or after start date." };

  const country = resolveCountry(countryInput);
  if (!country) return { message: "Enter a recognized country name or 2-letter code." };

  return {
    entry: {
      startDate,
      endDate,
      countryCode: country.code,
      countryName: country.name
    }
  };
}

function buildDayLocationEntry(originalDate: string, date: string, countryInput: string): { entry: DayLocationEntry } | { message: string } {
  if (!isValidIsoDate(date)) return { message: "Choose a valid date." };

  const country = resolveCountry(countryInput);
  if (!country) return { message: "Enter a recognized country name or 2-letter code." };

  return {
    entry: {
      originalDate,
      date,
      countryCode: country.code,
      countryName: country.name
    }
  };
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function replaceIsoYear(value: string, year: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${year}-01-01`;
  const candidate = `${year}${value.slice(4)}`;
  return isValidIsoDate(candidate) ? candidate : `${year}-01-01`;
}

function resolveCountry(input: string) {
  const value = input.trim();
  if (!value) return undefined;

  const code = value.toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) {
    return countryOptions.find((country) => country.code === code);
  }

  const normalizedInput = normalizeSearchText(value);
  const exactMatch = countryOptions.find((country) => normalizeSearchText(country.name) === normalizedInput);
  if (exactMatch) return exactMatch;

  const aliases: Record<string, string> = {
    america: "US",
    britain: "GB",
    "cote d ivoire": "CI",
    "great britain": "GB",
    "ivory coast": "CI",
    laos: "LA",
    russia: "RU",
    "south korea": "KR",
    uae: "AE",
    uk: "GB",
    "united states of america": "US",
    usa: "US",
    vietnam: "VN"
  };

  const aliasCode = aliases[normalizedInput];
  return aliasCode ? countryOptions.find((country) => country.code === aliasCode) : undefined;
}

function displayCountryName(code: string) {
  return countryNameOverrides[code] ?? displayRegionName(code) ?? code;
}

function displayRegionName(code: string) {
  try {
    const DisplayNames = (Intl as unknown as {
      DisplayNames?: new (locales: string[], options: { type: "region" }) => { of: (regionCode: string) => string | undefined };
    }).DisplayNames;
    return DisplayNames ? new DisplayNames(["en"], { type: "region" }).of(code) : undefined;
  } catch {
    return undefined;
  }
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function buildCalendarCells(month: Date): CalendarCell[] {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const leadingBlanks = getDay(startOfMonth(month));
  const cells: CalendarCell[] = [
    ...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `leading-${index}`, isBlank: true }) as const),
    ...days.map((date) => ({ date, iso: format(date, "yyyy-MM-dd"), isBlank: false }) as const)
  ];
  const trailingBlanks = (7 - (cells.length % 7)) % 7;

  return [
    ...cells,
    ...Array.from({ length: trailingBlanks }, (_, index) => ({ key: `trailing-${index}`, isBlank: true }) as const)
  ];
}

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function flagForCountry(countryCode: string) {
  if (countryCode.length !== 2) return countryCode;
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getPalette(isDark: boolean) {
  const neutral = getNeutralPalette(isDark);

  return {
    screen: neutral.backgroundPrimary,
    card: neutral.backgroundSecondary,
    foreground: neutral.foreground,
    muted: neutral.foregroundSecondary,
    weekday: neutral.foregroundTertiary,
    accent: neutral.primary,
    addButton: isDark ? neutral.backgroundSecondary : "rgba(255,255,255,0.78)",
    addBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    addShadow: neutral.shadow,
    blurTint: (isDark ? "dark" : "light") as "dark" | "light",
    chipFill: isDark ? neutral.backgroundTertiary : "rgba(0,0,0,0.04)",
    drawerBackdrop: isDark ? "rgba(0,0,0,0.76)" : "rgba(0,0,0,0.24)",
    errorBorder: isDark ? "rgba(248,113,113,0.3)" : "rgba(220,38,38,0.2)",
    errorFill: isDark ? "rgba(127,29,29,0.18)" : "rgba(254,226,226,0.72)",
    errorText: isDark ? "#fca5a5" : "#991b1b",
    glassBackdrop: isDark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.16)",
    glassBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
    glassHighlight: isDark ? "transparent" : "rgba(255,255,255,0.82)",
    glassRim: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    glassShadow: neutral.shadow,
    inputBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)",
    inputFill: isDark ? neutral.backgroundSecondary : "rgba(255,255,255,0.76)",
    menuGlassFill: neutral.backgroundPrimary,
    selectedBorder: isDark ? "rgba(255,255,255,0.42)" : neutral.foreground,
    selectedFill: isDark ? "#333333" : neutral.foreground,
    selectedForeground: isDark ? neutral.foreground : neutral.backgroundPrimary,
    selectedMutedForeground: isDark ? "#d4d4d4" : neutral.backgroundPrimary,
    placeholder: neutral.foregroundTertiary
  };
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18
  },
  topActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44
  },
  addButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    width: 44
  },
  modalRoot: {
    flex: 1
  },
  noPointerEvents: {
    pointerEvents: "none"
  },
  addMenu: {
    borderCurve: "continuous",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    position: "absolute",
    right: 16,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    top: 96,
    width: 260
  },
  addMenuContent: {
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  addMenuAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    height: 56
  },
  countryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  countryChip: {
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "48%",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  countryInput: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    minWidth: 0,
    padding: 0
  },
  countryInputShell: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14
  },
  calendarPicker: {
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  calendarPickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  calendarPickerTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  dateField: {
    flex: 1,
    minWidth: 0
  },
  dateBoundaryButton: {
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  dateRangePicker: {
    flexDirection: "row",
    gap: 10
  },
  dateRow: {
    flexDirection: "row",
    gap: 10
  },
  disabledControl: {
    opacity: 0.3
  },
  drawerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20
  },
  drawerHandle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    opacity: 0.72,
    width: 42
  },
  drawerHandleTouchArea: {
    alignItems: "center",
    height: 28,
    justifyContent: "center"
  },
  drawerHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  drawerHeaderText: {
    flex: 1,
    minWidth: 0
  },
  drawerIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  errorBox: {
    borderCurve: "continuous",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  fieldGroup: {
    gap: 7
  },
  glassHighlight: {
    height: "48%",
    left: 1,
    opacity: 0.42,
    position: "absolute",
    right: 1,
    top: 1
  },
  manualDrawer: {
    borderCurve: "continuous",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    maxHeight: "88%",
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.26,
    shadowRadius: 34
  },
  manualDrawerContent: {
    paddingHorizontal: 18,
    paddingTop: 10
  },
  manualDrawerRim: {
    ...StyleSheet.absoluteFillObject,
    borderCurve: "continuous",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1
  },
  manualForm: {
    gap: 14,
    marginTop: 18
  },
  manualInput: {
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 0
  },
  monthDrawer: {
    borderCurve: "continuous",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.26,
    shadowRadius: 34
  },
  monthDrawerContent: {
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 10
  },
  monthDrawerRim: {
    ...StyleSheet.absoluteFillObject,
    borderCurve: "continuous",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  monthOption: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: "30.8%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 46
  },
  monthPickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  pickerDayCell: {
    alignItems: "center",
    aspectRatio: 1,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minWidth: 0
  },
  pickerDayBlankCell: {
    aspectRatio: 1,
    flex: 1,
    minWidth: 0
  },
  pickerGrid: {
    gap: 4
  },
  pickerIconButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  pickerWeekdayRow: {
    flexDirection: "row"
  },
  pickerWeekdayText: {
    flex: 1,
    textAlign: "center"
  },
  pickerWeekRow: {
    flexDirection: "row",
    gap: 4
  },
  primaryAction: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 50,
    justifyContent: "center"
  },
  quickMenuRim: {
    ...StyleSheet.absoluteFillObject,
    borderCurve: "continuous",
    borderRadius: 28,
    borderWidth: 1
  },
  secondaryAction: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    height: 50,
    justifyContent: "center"
  },
  title: {
    flex: 1,
    fontFamily: "Inter_800ExtraBold",
    fontSize: 30,
    lineHeight: 37,
    paddingRight: 16
  },
  yearPicker: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    height: 52,
    justifyContent: "space-between",
    paddingHorizontal: 8
  },
  monthRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24
  },
  monthLabel: {
    alignItems: "center",
    flexDirection: "row"
  },
  monthText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 24
  },
  monthControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 34
  },
  monthButton: {
    alignItems: "center",
    height: 50,
    justifyContent: "center",
    width: 50
  },
  monthSummaryPanel: {
    borderCurve: "continuous",
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    marginTop: 18,
    padding: 14
  },
  monthSummaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  monthSummaryMetrics: {
    flexDirection: "row",
    gap: 8
  },
  monthSummaryMetric: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 62,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 8
  },
  monthSummaryFooter: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingTop: 10
  },
  weekdayRow: {
    flexDirection: "row",
    marginTop: 24
  },
  weekdayText: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center"
  },
  calendarGrid: {
    marginTop: 18
  },
  weekRow: {
    flexDirection: "row"
  },
  dayCell: {
    alignItems: "center",
    flex: 1,
    height: 56,
    justifyContent: "flex-start"
  },
  dayNumber: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 22
  },
  flagText: {
    fontSize: 17,
    lineHeight: 22,
    marginTop: 5
  },
  flagPlaceholder: {
    height: 22,
    marginTop: 5
  },
  spacer: {
    flexGrow: 1,
    minHeight: 0
  }
});
