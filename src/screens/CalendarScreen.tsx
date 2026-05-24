import { addDays, addMonths, endOfMonth, format, isAfter, isSameMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Globe2, PencilLine, Plus, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, useColorScheme, useWindowDimensions, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import { CalendarList, type CalendarListProps, type DateData } from "react-native-calendars";
import { BlurView } from "expo-blur";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing as ReanimatedEasing, Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeCalendarMonthGrid, isNativeCalendarMonthGridAvailable } from "../components/native/NativeCalendarMonthGrid";
import { NativeCalendarToolbar, isNativeCalendarToolbarAvailable } from "../components/native/NativeCalendarToolbar";
import { NativeEditDaySheet, isNativeEditDaySheetAvailable } from "../components/native/NativeEditDaySheet";
import { NativeManualEntrySheet, isNativeManualEntrySheetAvailable } from "../components/native/NativeManualEntrySheet";
import { NativeMonthYearSheet, isNativeMonthYearSheetAvailable } from "../components/native/NativeMonthYearSheet";
import { LiquidGlassLayer } from "../components/native/LiquidGlassLayer";
import { DrawerActionButton } from "../components/ui/drawer-action-button";
import { BlurReplaceText } from "../components/ui/blur-replace-text";
import { Text } from "../components/ui/text";
import { getNeutralPalette, iconStrokeWidth } from "../lib/colors";
import { useAppStore, type DayRecordPreview } from "../store/appStore";

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CALENDAR_MIN_YEAR = 1900;
const CALENDAR_MAX_YEAR = 2100;
const CALENDAR_DAY_TAP_SLOP = 14;
const CALENDAR_DAY_TAP_MAX_DURATION_MS = 700;
const MANUAL_ENTRY_MIN_DATE = "1900-01-01";
const MANUAL_ENTRY_MAX_DATE = "2100-12-31";
type CountryOption = { code: string; name: string };
type CalendarDayTouchStart = {
  iso: string;
  pageX: number;
  pageY: number;
  startedAt: number;
};

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

export function CalendarScreen() {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { monthRecords, yearRecords, selectedDate, setSelectedDate, settings, addManualEntry, updateDayEntry, deleteDayEntry } = useAppStore();
  const isDark = settings.appearance === "dark" || (settings.appearance === "system" && scheme === "dark");
  const palette = getPalette(isDark);
  const calendarWidth = Math.max(280, windowWidth - 36);
  const [month, setMonth] = useState(() => startOfMonth(parseISO(selectedDate)));
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [openManualEntryAfterMenuClose, setOpenManualEntryAfterMenuClose] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const selectedDateInMonth = isSameMonth(parseISO(selectedDate), month) ? selectedDate : todayIso;
  const recordsByDate = useMemo(() => new Map(monthRecords.map((record) => [record.date, record])), [monthRecords]);
  const yearRecordsByDate = useMemo(() => new Map(yearRecords.map((record) => [record.date, record])), [yearRecords]);
  const nativeManualEntryRecords = useMemo(
    () =>
      yearRecords
        .filter((record) => record.primary_country_code)
        .map((record) => ({
          date: record.date,
          countryCode: record.primary_country_code!
        })),
    [yearRecords]
  );
  const nativeCalendarDayRecords = useMemo(
    () =>
      monthRecords.map((record) => ({
        date: record.date,
        countryCode: record.primary_country_code ?? ""
      })),
    [monthRecords]
  );
  const monthSummary = useMemo(() => buildMonthSummary(monthRecords, month), [monthRecords, month]);
  const editingRecord = editingDate ? recordsByDate.get(editingDate) : undefined;
  const calendarScrollRange = useMemo(() => getCalendarScrollRange(month), [month]);
  const calendarMonthKey = useMemo(() => format(month, "yyyy-MM"), [month]);
  const calendarRenderKey = useMemo(() => `${calendarMonthKey}:${selectedDate}:${monthRecords.map((record) => `${record.date}:${record.primary_country_code ?? ""}`).join(",")}`, [calendarMonthKey, monthRecords, selectedDate]);
  const programmaticMonthIsoRef = useRef<string | null>(null);
  const calendarDayTouchStartRef = useRef<CalendarDayTouchStart | null>(null);
  const lastDayOpenRef = useRef<{ iso: string; openedAt: number } | null>(null);

  const setVisibleMonth = useCallback((nextMonth: Date) => {
    const start = startOfMonth(nextMonth);
    const startIso = format(start, "yyyy-MM-dd");
    setMonth((currentMonth) => (format(currentMonth, "yyyy-MM-dd") === startIso ? currentMonth : start));
    return startIso;
  }, []);

  const markProgrammaticMonth = useCallback((monthIso: string) => {
    programmaticMonthIsoRef.current = monthIso;
  }, []);

  const selectDay = useCallback((iso: string) => {
    const now = Date.now();
    const lastOpen = lastDayOpenRef.current;
    if (lastOpen?.iso === iso && now - lastOpen.openedAt < 250) return;

    lastDayOpenRef.current = { iso, openedAt: now };
    setEditingDate(iso);
    void setSelectedDate(iso).catch((error) => {
      console.warn("[calendar] Failed to select day", error);
    });
  }, [setSelectedDate]);

  const handleDayTouchStart = useCallback((iso: string, event: GestureResponderEvent) => {
    calendarDayTouchStartRef.current = {
      iso,
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
      startedAt: Date.now()
    };
  }, []);

  const handleDayTouchEnd = useCallback(
    (iso: string, event: GestureResponderEvent) => {
      const touchStart = calendarDayTouchStartRef.current;
      calendarDayTouchStartRef.current = null;
      if (!touchStart || touchStart.iso !== iso) return;

      const deltaX = Math.abs(event.nativeEvent.pageX - touchStart.pageX);
      const deltaY = Math.abs(event.nativeEvent.pageY - touchStart.pageY);
      const duration = Date.now() - touchStart.startedAt;
      if (deltaX <= CALENDAR_DAY_TAP_SLOP && deltaY <= CALENDAR_DAY_TAP_SLOP && duration <= CALENDAR_DAY_TAP_MAX_DURATION_MS) {
        selectDay(iso);
      }
    },
    [selectDay]
  );

  const shiftMonth = useCallback(async (direction: -1 | 1) => {
    const nextMonth = direction === 1 ? addMonths(month, 1) : subMonths(month, 1);
    const nextIso = setVisibleMonth(nextMonth);
    markProgrammaticMonth(nextIso);
    await setSelectedDate(nextIso);
  }, [markProgrammaticMonth, month, setSelectedDate, setVisibleMonth]);

  async function changeMonth(nextMonth: Date) {
    const nextIso = setVisibleMonth(nextMonth);
    markProgrammaticMonth(nextIso);
    await setSelectedDate(nextIso);
  }

  const handleVisibleMonthsChange = useCallback(
    (visibleMonths: DateData[]) => {
      const visibleMonth = visibleMonths[0];
      if (!visibleMonth?.dateString) return;

      const nextMonth = startOfMonth(parseISO(visibleMonth.dateString));
      const nextIso = format(nextMonth, "yyyy-MM-dd");
      if (programmaticMonthIsoRef.current) {
        const programmaticMonthIso = programmaticMonthIsoRef.current;
        programmaticMonthIsoRef.current = null;
        if (programmaticMonthIso === nextIso) return;
      }
      if (nextIso === format(month, "yyyy-MM-dd")) return;

      setVisibleMonth(nextMonth);
      void setSelectedDate(nextIso);
    },
    [month, setSelectedDate, setVisibleMonth]
  );

  const renderCalendarDay = useCallback(
    ({ date, state }: { date?: DateData; state?: string }) => {
      if (!date) return <View style={styles.dayCell} />;

      const iso = date.dateString;
      const dayDate = parseISO(iso);
      const isVisibleMonthDay = isSameMonth(dayDate, month);
      const record = recordsByDate.get(iso);
      const isSelected = iso === selectedDateInMonth;
      const isFuture = isAfter(dayDate, parseISO(todayIso));
      const countryCode = isVisibleMonthDay ? record?.primary_country_code ?? null : null;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${format(dayDate, "MMMM d")}${countryCode ? `, ${countryCode}` : ""}`}
          hitSlop={6}
          pressRetentionOffset={12}
          style={styles.dayCell}
          onPress={() => selectDay(iso)}
          onTouchCancel={() => {
            calendarDayTouchStartRef.current = null;
          }}
          onTouchEnd={(event) => handleDayTouchEnd(iso, event)}
          onTouchStart={(event) => handleDayTouchStart(iso, event)}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.dayNumber,
              {
                color: isSelected ? palette.accent : palette.foreground,
                opacity: state === "disabled" || (isFuture && !countryCode) ? 0.56 : 1
              }
            ]}
          >
            {date.day}
          </Text>
          <Text numberOfLines={1} style={styles.flagText}>
            {countryCode ? flagForCountry(countryCode) : ""}
          </Text>
        </Pressable>
      );
    },
    [month, palette.accent, palette.foreground, recordsByDate, selectDay, selectedDateInMonth, todayIso]
  );

  function openManualEntry() {
    setOpenManualEntryAfterMenuClose(true);
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
    setVisibleMonth(parseISO(entry.startDate));
  }

  async function updateDay(entry: DayLocationEntry) {
    await updateDayEntry(entry);
    setVisibleMonth(parseISO(entry.date));
  }

  async function deleteDay(date: string) {
    await deleteDayEntry(date);
    setVisibleMonth(parseISO(date));
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
          {isNativeCalendarToolbarAvailable ? (
            <NativeCalendarToolbar
              foregroundColor={palette.foreground}
              label={format(month, "MMMM yyyy")}
              style={styles.nativeCalendarToolbar}
              onManualEntry={() => {
                setOpenManualEntryAfterMenuClose(false);
                setIsManualEntryOpen(true);
              }}
              onMonthPress={() => setIsMonthPickerOpen(true)}
              onNextMonth={() => void shiftMonth(1)}
              onPreviousMonth={() => void shiftMonth(-1)}
            />
          ) : (
            <>
              <View style={styles.topActionRow}>
                <Text className="flex-1 text-3xl font-extrabold" numberOfLines={1} adjustsFontSizeToFit style={[styles.title, { color: palette.foreground }]}>
                  History
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Add travel entry" style={({ pressed }) => [styles.addButton, { shadowColor: palette.addShadow }, pressed ? styles.roundIconButtonPressed : null]} onPress={() => setIsAddMenuOpen(true)}>
                  <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={54} tint={palette.blurTint} tintColor={palette.addButton} style={StyleSheet.absoluteFill} />
                  <Plus size={22} color={palette.foreground} strokeWidth={iconStrokeWidth} />
                </Pressable>
              </View>

              <View style={styles.monthRow}>
                <Pressable accessibilityRole="button" accessibilityLabel="Previous month" style={({ pressed }) => [styles.monthButton, { shadowColor: palette.glassShadow }, pressed ? styles.roundIconButtonPressed : null]} onPress={() => void shiftMonth(-1)}>
                  <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={54} tint={palette.blurTint} tintColor={palette.addButton} style={StyleSheet.absoluteFill} />
                  <ChevronLeft size={20} color={palette.foreground} strokeWidth={iconStrokeWidth} />
                </Pressable>
                <MonthHeaderButton label={format(month, "MMMM yyyy")} palette={palette} style={styles.monthCenterLabel} onPress={() => setIsMonthPickerOpen(true)} />
                <Pressable accessibilityRole="button" accessibilityLabel="Next month" style={({ pressed }) => [styles.monthButton, { shadowColor: palette.glassShadow }, pressed ? styles.roundIconButtonPressed : null]} onPress={() => void shiftMonth(1)}>
                  <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={54} tint={palette.blurTint} tintColor={palette.addButton} style={StyleSheet.absoluteFill} />
                  <ChevronRight size={20} color={palette.foreground} strokeWidth={iconStrokeWidth} />
                </Pressable>
              </View>
            </>
          )}

        <MonthSummaryPanel palette={palette} summary={monthSummary} />

        {isNativeCalendarMonthGridAvailable ? (
          <NativeCalendarMonthGrid
            dayRecords={nativeCalendarDayRecords}
            monthDate={format(month, "yyyy-MM-dd")}
            palette={{
              accent: palette.accent,
              foreground: palette.foreground,
              weekday: palette.weekdayHeader
            }}
            selectedDate={selectedDateInMonth}
            style={[styles.nativeCalendarMonthGrid, { width: calendarWidth }]}
            onDayPress={selectDay}
          />
        ) : (
          <>
            <View style={[styles.weekdayRow, { width: calendarWidth }]}>
              {weekdays.map((weekday) => (
                <Text key={weekday} numberOfLines={1} style={[styles.weekdayLabel, { color: palette.weekdayHeader }]}>
                  {weekday.slice(0, 3)}
                </Text>
              ))}
            </View>

            <CalendarList
              animateScroll
              calendarHeight={390}
              calendarStyle={styles.calendarPage}
              calendarWidth={calendarWidth}
              current={format(month, "yyyy-MM-dd")}
              dayComponent={renderCalendarDay}
              extraData={calendarRenderKey}
              firstDay={0}
              futureScrollRange={calendarScrollRange.futureScrollRange}
              hideArrows
              hideDayNames
              hideExtraDays
              horizontal
              initialDate={format(month, "yyyy-MM-dd")}
              key={calendarMonthKey}
              keyboardShouldPersistTaps="handled"
              pagingEnabled
              pastScrollRange={calendarScrollRange.pastScrollRange}
              removeClippedSubviews={false}
              renderHeader={() => null}
              showScrollIndicator={false}
              style={styles.calendarGrid}
              theme={{
                calendarBackground: "transparent",
                textSectionTitleColor: palette.weekdayHeader,
                textDayHeaderFontFamily: "Inter_700Bold",
                textDayHeaderFontSize: 12,
                weekVerticalMargin: 0,
                "stylesheet.calendar.header": {
                  header: styles.calendarLibraryHiddenHeader,
                  dayHeader: styles.calendarLibraryDayHeader,
                  week: styles.calendarLibraryWeekHeader
                },
                "stylesheet.calendar.main": {
                  container: styles.calendarLibraryContainer,
                  dayContainer: styles.calendarLibraryDayContainer,
                  emptyDayContainer: styles.calendarLibraryEmptyDayContainer,
                  monthView: styles.calendarLibraryMonthView,
                  week: styles.calendarLibraryWeek
                }
              } as CalendarListProps["theme"]}
              onDayPress={(date) => selectDay(date.dateString)}
              onVisibleMonthsChange={handleVisibleMonthsChange}
            />
          </>
        )}

        <View style={styles.spacer} />
        </View>
      </ScrollView>

      <CalendarAddMenu
        palette={palette}
        visible={isAddMenuOpen}
        onClose={handleAddMenuClose}
        onClosed={handleAddMenuClosed}
        onManualEntry={openManualEntry}
      />
      {isNativeMonthYearSheetAvailable ? (
        <NativeMonthYearSheet
          monthIndex={month.getMonth()}
          palette={{
            foreground: palette.foreground,
            muted: palette.muted,
            pill: palette.inputFill,
            accent: palette.foreground,
            accentForeground: palette.actionPrimaryForeground,
            border: palette.inputBorder,
            menuGlassFill: palette.menuGlassFill
          }}
          visible={isMonthPickerOpen}
          year={month.getFullYear()}
          onClose={() => setIsMonthPickerOpen(false)}
          onConfirm={(monthIndex, year) => {
            setIsMonthPickerOpen(false);
            void changeMonth(new Date(year, monthIndex, 1));
          }}
        />
      ) : (
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
      )}
      {isNativeManualEntrySheetAvailable ? (
        <NativeManualEntrySheet
          countries={countryOptions}
          existingRecords={nativeManualEntryRecords}
          initialDate={selectedDateInMonth}
          palette={{
            actionPrimaryFill: palette.actionPrimaryFill,
            actionPrimaryForeground: palette.actionPrimaryForeground,
            actionSecondaryBorder: palette.actionSecondaryBorder,
            actionSecondaryFill: palette.actionSecondaryFill,
            card: palette.card,
            chipFill: palette.chipFill,
            errorBorder: palette.errorBorder,
            errorFill: palette.errorFill,
            errorText: palette.errorText,
            foreground: palette.foreground,
            inputBorder: palette.inputBorder,
            inputFill: palette.inputFill,
            menuGlassFill: palette.menuGlassFill,
            muted: palette.muted,
            placeholder: palette.placeholder,
            selectedBorder: palette.selectedBorder,
            selectedFill: palette.selectedFill,
            selectedForeground: palette.selectedForeground,
            weekday: palette.weekday
          }}
          visible={isManualEntryOpen}
          onClose={() => setIsManualEntryOpen(false)}
          onConfirm={(entry) => {
            void (async () => {
              try {
                await insertManualEntry(entry);
                setIsManualEntryOpen(false);
              } catch (error) {
                Alert.alert("Insert failed", error instanceof Error ? error.message : "Could not insert manual entry.");
              }
            })();
          }}
        />
      ) : (
        <ManualEntryDrawer
          existingRecordsByDate={yearRecordsByDate}
          initialDate={selectedDateInMonth}
          palette={palette}
          visible={isManualEntryOpen}
          onClose={() => setIsManualEntryOpen(false)}
          onConfirm={async (entry) => {
            await insertManualEntry(entry);
            setIsManualEntryOpen(false);
          }}
        />
      )}
      {isNativeEditDaySheetAvailable ? (
        <NativeEditDaySheet
          canDelete={Boolean(editingRecord)}
          countries={countryOptions}
          initialCountryInput={editingRecord?.primary_country_name ?? editingRecord?.primary_country_code ?? ""}
          initialDate={editingDate ?? selectedDateInMonth}
          palette={palette}
          visible={Boolean(editingDate)}
          onClose={() => setEditingDate(null)}
          onConfirm={(entry) => {
            void (async () => {
              try {
                await updateDay(entry);
                setEditingDate(null);
              } catch (error) {
                Alert.alert("Update failed", error instanceof Error ? error.message : "Could not update this day.");
              }
            })();
          }}
          onDelete={(date) => {
            void (async () => {
              try {
                await deleteDay(date);
                setEditingDate(null);
              } catch (error) {
                Alert.alert("Delete failed", error instanceof Error ? error.message : "Could not delete this day.");
              }
            })();
          }}
        />
      ) : (
        <DayEditDrawer
          canDelete={Boolean(editingRecord)}
          initialCountryInput={editingRecord?.primary_country_name ?? editingRecord?.primary_country_code ?? ""}
          initialDate={editingDate ?? selectedDateInMonth}
          palette={palette}
          visible={Boolean(editingDate)}
          onClose={() => setEditingDate(null)}
          onConfirm={async (entry) => {
            await updateDay(entry);
            setEditingDate(null);
          }}
          onDelete={async (date) => {
            await deleteDay(date);
            setEditingDate(null);
          }}
        />
      )}
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

function MonthHeaderButton({ label, palette, style, onPress }: { label: string; palette: ReturnType<typeof getPalette>; style?: StyleProp<ViewStyle>; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Change month and year, ${label}`}
      style={({ pressed }) => [
        styles.monthLabel,
        style,
        {
          borderColor: palette.actionPrimaryFill,
          shadowColor: palette.glassShadow
        },
        pressed ? styles.monthLabelPressed : null
      ]}
      onPress={onPress}
    >
      <BlurView intensity={84} pointerEvents="none" tint={palette.basicBlurTint} style={[StyleSheet.absoluteFill, styles.monthLabelGlass]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.monthLabelOverlay, { backgroundColor: palette.actionPrimaryFill, borderColor: palette.actionPrimaryFill }]} />
      <View pointerEvents="none" style={[styles.monthLabelSheen, { backgroundColor: palette.monthLabelSheen }]} />
      <View pointerEvents="none" style={[styles.monthLabelBottomGlow, { backgroundColor: palette.monthLabelBottomGlow }]} />
      <View style={styles.monthLabelContent}>
        <BlurReplaceText value={label} numberOfLines={1} adjustsFontSizeToFit style={[styles.monthText, { color: palette.actionPrimaryForeground }]} />
      </View>
    </Pressable>
  );
}

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
        <BlurReplaceText
          value={`${summary.recordedDays}/${summary.totalDays} days tracked`}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.monthSummaryTrackedText, { color: palette.muted }]}
        />
      </View>

      <View style={styles.monthSummaryMetrics}>
        <MonthSummaryMetric label="India" value={summary.indiaDays} palette={palette} />
        <MonthSummaryMetric label="Abroad" value={summary.abroadDays} palette={palette} />
        <MonthSummaryMetric label="Travel" value={summary.travelDays} palette={palette} />
        <MonthSummaryMetric label="Pending" value={summary.pendingDays} palette={palette} />
      </View>

      <View style={[styles.monthSummaryFooter, { borderTopColor: palette.inputBorder }]}>
        <BlurReplaceText
          value={countrySummary}
          numberOfLines={1}
          adjustsFontSizeToFit
          containerStyle={styles.monthSummaryCountryStage}
          style={[styles.monthSummaryCountryText, { color: palette.muted }]}
        />
        {statusSummary ? (
          <BlurReplaceText value={statusSummary} style={[styles.monthSummaryStatusText, { color: palette.weekday }]} />
        ) : null}
      </View>
    </View>
  );
}

function MonthSummaryMetric({ label, value, palette }: { label: string; value: number; palette: ReturnType<typeof getPalette> }) {
  return (
    <View style={[styles.monthSummaryMetric, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder }]}>
      <BlurReplaceText value={String(value)} style={[styles.monthSummaryMetricValue, { color: palette.foreground }]} />
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

function getCalendarScrollRange(anchorMonth: Date) {
  const anchorIndex = getMonthIndex(anchorMonth);
  const minIndex = CALENDAR_MIN_YEAR * 12;
  const maxIndex = CALENDAR_MAX_YEAR * 12 + 11;

  return {
    pastScrollRange: Math.max(0, anchorIndex - minIndex),
    futureScrollRange: Math.max(0, maxIndex - anchorIndex)
  };
}

function getMonthIndex(date: Date) {
  return date.getFullYear() * 12 + date.getMonth();
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
              <BlurReplaceText value={String(draftYear)} style={[styles.monthPickerYearText, { color: palette.foreground }]} />
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
                    <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={48} tint={palette.blurTint} tintColor={selected ? palette.selectedFill : palette.chipFill} style={StyleSheet.absoluteFill} />
                    <Text className="text-sm font-bold" style={{ color: selected ? palette.selectedForeground : palette.foreground }}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.drawerActions}>
              <DrawerActionButton backgroundColor={palette.actionSecondaryFill} borderColor={palette.actionSecondaryBorder} foregroundColor={palette.foreground} title="Cancel" style={styles.nativeActionButton} onPress={onClose} />
              <DrawerActionButton backgroundColor={palette.actionPrimaryFill} borderColor={palette.actionPrimaryFill} foregroundColor={palette.actionPrimaryForeground} systemImage="checkmark" title="Confirm" style={styles.nativeActionButton} onPress={confirmSelection} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ManualEntryDrawer({
  existingRecordsByDate,
  initialDate,
  palette,
  visible,
  onClose,
  onConfirm
}: {
  existingRecordsByDate: ReadonlyMap<string, DayRecordPreview>;
  initialDate: string;
  palette: ReturnType<typeof getPalette>;
  visible: boolean;
  onClose: () => void;
  onConfirm: (entry: ManualTravelEntry) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset(insets.bottom);
  const [isRendered, setIsRendered] = useState(visible);
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(() => getDefaultManualEndDate(initialDate));
  const [activeDateField, setActiveDateField] = useState<"start" | "end">("start");
  const [countryInput, setCountryInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setStartDate(initialDate);
      setEndDate(getDefaultManualEndDate(initialDate));
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

  function updateDateField(field: "start" | "end", date: Date) {
    const iso = format(date, "yyyy-MM-dd");
    setActiveDateField(field);
    setErrorMessage(null);

    if (field === "start") {
      const defaultEndDate = getDefaultManualEndDate(iso);
      setStartDate(iso);
      setEndDate(defaultEndDate);
      return;
    }

    setEndDate(iso);
    if (iso < startDate) setStartDate(iso);
  }

  async function submit() {
    const result = buildManualEntry(startDate, endDate, countryInput);
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

  const manualContent = (
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
        <CalendarDateRangeFields
          activeField={activeDateField}
          endDate={endDate}
          existingRecordsByDate={existingRecordsByDate}
          palette={palette}
          startDate={startDate}
          onActiveFieldChange={setActiveDateField}
          onDateChange={updateDateField}
        />

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
                <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={48} tint={palette.blurTint} tintColor={selected ? palette.selectedFill : palette.chipFill} style={StyleSheet.absoluteFill} />
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
        <DrawerActionButton disabled={isSaving} backgroundColor={palette.actionSecondaryFill} borderColor={palette.actionSecondaryBorder} foregroundColor={palette.foreground} title="Cancel" style={styles.nativeActionButton} onPress={onClose} />
        <DrawerActionButton disabled={isSaving} backgroundColor={palette.actionPrimaryFill} borderColor={palette.actionPrimaryFill} foregroundColor={palette.actionPrimaryForeground} systemImage="checkmark" title={isSaving ? "Inserting" : "Confirm"} style={styles.nativeActionButton} onPress={() => void submit()} />
      </View>
    </ScrollView>
  );

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
            styles.manualDrawer,
            {
              borderColor: palette.glassBorder,
              bottom: keyboardInset,
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

          {manualContent}
        </Animated.View>
      </View>
    </Modal>
  );
}

function DayEditDrawer({
  canDelete,
  initialCountryInput,
  initialDate,
  palette,
  visible,
  onClose,
  onConfirm,
  onDelete
}: {
  canDelete: boolean;
  initialCountryInput: string;
  initialDate: string;
  palette: ReturnType<typeof getPalette>;
  visible: boolean;
  onClose: () => void;
  onConfirm: (entry: DayLocationEntry) => Promise<void>;
  onDelete: (date: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset(insets.bottom);
  const [isRendered, setIsRendered] = useState(visible);
  const [draftDate, setDraftDate] = useState(initialDate);
  const [countryInput, setCountryInput] = useState(initialCountryInput);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setDraftDate(initialDate);
      setCountryInput(initialCountryInput);
      setErrorMessage(null);
      setIsSaving(false);
      setIsDeleting(false);
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
    if (isDeleting) return;

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

  function confirmDelete() {
    if (isSaving || isDeleting) return;

    Alert.alert("Delete history entry?", `This removes ${initialDate} from History.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteEntry();
        }
      }
    ]);
  }

  async function deleteEntry() {
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await onDelete(initialDate);
    } catch (error) {
      setIsDeleting(false);
      setErrorMessage(error instanceof Error ? error.message : "Could not delete this day.");
    }
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
            styles.manualDrawer,
            {
              borderColor: palette.glassBorder,
              bottom: keyboardInset,
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
              {canDelete ? (
                <Pressable
                  accessibilityLabel={isDeleting ? "Deleting" : "Delete"}
                  accessibilityRole="button"
                  disabled={isSaving || isDeleting}
                  hitSlop={8}
                  style={[styles.drawerHeaderDeleteButton, { backgroundColor: palette.destructiveFill, borderColor: palette.destructiveBorder }, isSaving || isDeleting ? styles.disabledHeaderButton : null]}
                  onPress={confirmDelete}
                >
                  <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={48} tint={palette.blurTint} tintColor={palette.destructiveFill} style={StyleSheet.absoluteFill} />
                  <Trash2 size={19} color={palette.destructiveForeground} strokeWidth={iconStrokeWidth} />
                </Pressable>
              ) : null}
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
                      <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={48} tint={palette.blurTint} tintColor={selected ? palette.selectedFill : palette.chipFill} style={StyleSheet.absoluteFill} />
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
              <DrawerActionButton disabled={isSaving || isDeleting} backgroundColor={palette.actionSecondaryFill} borderColor={palette.actionSecondaryBorder} foregroundColor={palette.foreground} title="Cancel" style={styles.nativeActionButton} onPress={onClose} />
              <DrawerActionButton disabled={isSaving || isDeleting} backgroundColor={palette.actionPrimaryFill} borderColor={palette.actionPrimaryFill} foregroundColor={palette.actionPrimaryForeground} systemImage="checkmark" title={isSaving ? "Updating" : "Update"} style={styles.nativeActionButton} onPress={() => void submit()} />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function CalendarDateRangeFields({
  activeField,
  endDate,
  existingRecordsByDate,
  palette,
  startDate,
  onActiveFieldChange,
  onDateChange
}: {
  activeField: "start" | "end";
  endDate: string;
  existingRecordsByDate: ReadonlyMap<string, DayRecordPreview>;
  palette: ReturnType<typeof getPalette>;
  startDate: string;
  onActiveFieldChange: (field: "start" | "end") => void;
  onDateChange: (field: "start" | "end", date: Date) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseISO(startDate)));
  const activeMinDate = activeField === "end" ? startDate : MANUAL_ENTRY_MIN_DATE;
  const activeMaxDate = MANUAL_ENTRY_MAX_DATE;
  const monthCells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const previousMonth = subMonths(visibleMonth, 1);
  const nextMonth = addMonths(visibleMonth, 1);
  const canShowPreviousMonth = format(endOfMonth(previousMonth), "yyyy-MM-dd") >= activeMinDate;
  const canShowNextMonth = format(startOfMonth(nextMonth), "yyyy-MM-dd") <= activeMaxDate;
  const todayIso = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  function selectDate(iso: string) {
    if (iso < activeMinDate || iso > activeMaxDate) return;

    onDateChange(activeField, parseISO(iso));
    setVisibleMonth(startOfMonth(parseISO(iso)));
    if (activeField === "start") {
      onActiveFieldChange("end");
    }
  }

  return (
    <View style={styles.rangeSelector}>
      <View style={styles.dateRangePicker}>
        <RangeBoundaryButton
          active={activeField === "start"}
          iso={startDate}
          label="Start"
          palette={palette}
          onPress={() => {
            onActiveFieldChange("start");
            setVisibleMonth(startOfMonth(parseISO(startDate)));
          }}
        />
        <RangeBoundaryButton
          active={activeField === "end"}
          iso={endDate}
          label="End"
          palette={palette}
          onPress={() => {
            onActiveFieldChange("end");
            setVisibleMonth(startOfMonth(parseISO(endDate)));
          }}
        />
      </View>

      <View style={[styles.rangeCalendarShell, { backgroundColor: palette.inputFill, borderColor: palette.inputBorder }]}>
        <View style={styles.rangeCalendarHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            disabled={!canShowPreviousMonth}
            hitSlop={8}
            style={styles.rangeCalendarNavButton}
            onPress={() => setVisibleMonth(previousMonth)}
          >
            <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={36} tint={palette.blurTint} style={StyleSheet.absoluteFill} />
            <ChevronLeft size={22} color={palette.foreground} opacity={canShowPreviousMonth ? 1 : 0.26} strokeWidth={iconStrokeWidth} />
          </Pressable>
          <Text className="text-sm font-extrabold" style={{ color: palette.foreground }}>
            {format(visibleMonth, "MMMM yyyy")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            disabled={!canShowNextMonth}
            hitSlop={8}
            style={styles.rangeCalendarNavButton}
            onPress={() => setVisibleMonth(nextMonth)}
          >
            <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={36} tint={palette.blurTint} style={StyleSheet.absoluteFill} />
            <ChevronRight size={22} color={palette.foreground} opacity={canShowNextMonth ? 1 : 0.26} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>

        <View style={styles.rangeWeekdayRow}>
          {weekdays.map((weekday) => (
            <Text key={weekday} className="text-[10px] font-bold" style={[styles.rangeWeekdayText, { color: palette.weekday }]}>
              {weekday}
            </Text>
          ))}
        </View>

        <View style={styles.rangeMonthGrid}>
          {monthCells.map((cell, index) => {
            if (!cell) return <View key={`empty-${index}`} style={styles.rangeDayCell} />;

            const disabled = cell.iso < activeMinDate || cell.iso > activeMaxDate;
            const inRange = cell.iso >= startDate && cell.iso <= endDate;
            const isStart = cell.iso === startDate;
            const isEnd = cell.iso === endDate;
            const isSelected = isStart || isEnd;
            const isOnlyDay = startDate === endDate && isSelected;
            const isFutureUnselected = cell.iso > todayIso && !inRange;
            const dayOpacity = disabled ? 0.34 : isFutureUnselected ? 0.62 : 1;
            const existingCountryCode = existingRecordsByDate.get(cell.iso)?.primary_country_code ?? null;

            return (
              <Pressable
                key={cell.iso}
                accessibilityRole="button"
                accessibilityLabel={`Select ${format(parseISO(cell.iso), "MMMM d, yyyy")}`}
                disabled={disabled}
                style={styles.rangeDayCell}
                onPress={() => selectDate(cell.iso)}
              >
                {inRange && !isOnlyDay ? (
                  <View
                    style={[
                      styles.rangeDayBand,
                      {
                        backgroundColor: palette.chipFill,
                        left: isStart ? "50%" : 0,
                        right: isEnd ? "50%" : 0
                      }
                    ]}
                  />
                ) : null}
                <View style={[styles.rangeDayCircle, { backgroundColor: isSelected ? palette.selectedFill : "transparent", borderColor: isSelected ? palette.selectedBorder : "transparent", opacity: dayOpacity }]}>
                  <Text className="text-xs font-bold" style={{ color: isSelected ? palette.selectedForeground : palette.foreground }}>
                    {cell.day}
                  </Text>
                </View>
                {existingCountryCode ? (
                  <Text className="text-xs" style={[styles.rangeDayFlag, { opacity: dayOpacity }]}>
                    {flagForCountry(existingCountryCode)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function buildMonthCells(month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const leadingDays = monthStart.getDay();
  const cells: Array<{ iso: string; day: number } | null> = Array.from({ length: leadingDays }, () => null);

  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    const date = new Date(monthStart);
    date.setDate(day);
    cells.push({ iso: format(date, "yyyy-MM-dd"), day });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getDefaultManualEndDate(startDate: string) {
  const nextDay = format(addDays(parseISO(startDate), 1), "yyyy-MM-dd");
  return nextDay <= MANUAL_ENTRY_MAX_DATE ? nextDay : startDate;
}

function RangeBoundaryButton({
  active,
  iso,
  label,
  palette,
  onPress
}: {
  active: boolean;
  iso: string;
  label: string;
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
      <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={46} tint={palette.blurTint} tintColor={active ? palette.selectedFill : palette.inputFill} style={StyleSheet.absoluteFill} />
      <View style={styles.dateBoundaryContent}>
        <Text className="text-xs font-bold" style={{ color: active ? palette.selectedMutedForeground : palette.muted }}>
          {label}
        </Text>
        <Text className="text-sm font-extrabold" style={{ color: active ? palette.selectedForeground : palette.foreground }} numberOfLines={1}>
          {format(parseISO(iso), "MMM d")}
        </Text>
      </View>
    </Pressable>
  );
}

function CalendarAddMenu({
  palette,
  visible,
  onClose,
  onClosed,
  onManualEntry
}: {
  palette: ReturnType<typeof getPalette>;
  visible: boolean;
  onClose: () => void;
  onClosed: () => void;
  onManualEntry: () => void;
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
          <GlassBlurLayer tint={palette.blurTint} intensity={32} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.menuBackdrop }]} />
        </Animated.View>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.addMenu,
            {
              backgroundColor: palette.addMenuFill,
              borderColor: palette.addMenuBorder,
              shadowColor: palette.glassShadow
            },
            menuStyle
          ]}
        >
          <GlassBlurLayer tint={palette.blurTint} intensity={72} style={[StyleSheet.absoluteFill, styles.noPointerEvents]} />
          <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { backgroundColor: palette.addMenuFill }]} />
          <View style={[styles.addMenuHighlight, styles.noPointerEvents, { backgroundColor: palette.addMenuHighlight }]} />
          <View style={[styles.quickMenuRim, styles.noPointerEvents, { borderColor: palette.addMenuRim }]} />
          <View style={styles.addMenuContent}>
            <AddMenuAction label="Manual Entry" palette={palette} onPress={onManualEntry} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function GlassBlurLayer({ tint, intensity, style }: { tint: ReturnType<typeof getPalette>["blurTint"]; intensity: number; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === "web") return <BlurView tint={tint} intensity={intensity} style={style} />;
  return <LiquidGlassLayer colorScheme="auto" glassStyle="regular" intensity={intensity} tint={tint} style={style} />;
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

function useKeyboardInset(safeAreaBottom: number) {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(Math.max(0, event.endCoordinates.height - safeAreaBottom));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [safeAreaBottom]);

  return keyboardInset;
}

function AddMenuAction({ label, onPress, palette }: { label: string; onPress: () => void; palette: ReturnType<typeof getPalette> }) {
  return (
    <Pressable accessibilityRole="menuitem" accessibilityLabel={label} style={styles.addMenuAction} onPress={onPress}>
      <PencilLine size={28} color={palette.foreground} strokeWidth={iconStrokeWidth} />
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

function buildManualEntry(startDate: string, endDate: string, countryInput: string): { entry: ManualTravelEntry } | { message: string } {
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) return { message: "Enter dates as YYYY-MM-DD." };
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
    weekdayHeader: isDark ? "#f2f2f7" : "#0a0a0a",
    accent: neutral.primary,
    accentForeground: neutral.primaryForeground,
    actionPrimaryFill: neutral.foreground,
    actionPrimaryForeground: neutral.backgroundPrimary,
    actionSecondaryBorder: isDark ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.14)",
    actionSecondaryFill: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.04)",
    addButton: isDark ? neutral.backgroundSecondary : "rgba(255,255,255,0.78)",
    addBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    addShadow: neutral.shadow,
    addMenuBorder: isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.62)",
    addMenuFill: isDark ? "rgba(30,30,32,0.88)" : "rgba(255,255,255,0.62)",
    addMenuHighlight: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.58)",
    addMenuRim: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.46)",
    basicBlurTint: (isDark ? "dark" : "light") as "dark" | "light",
    blurTint: (isDark ? "systemThinMaterialDark" : "systemThinMaterialLight") as "systemThinMaterialDark" | "systemThinMaterialLight",
    chipFill: isDark ? neutral.backgroundTertiary : "rgba(0,0,0,0.04)",
    drawerBackdrop: isDark ? "rgba(0,0,0,0.46)" : "rgba(0,0,0,0.14)",
    errorBorder: isDark ? "rgba(248,113,113,0.3)" : "rgba(220,38,38,0.2)",
    errorFill: isDark ? "rgba(127,29,29,0.18)" : "rgba(254,226,226,0.72)",
    errorText: isDark ? "#fca5a5" : "#991b1b",
    destructiveBorder: isDark ? "rgba(248,113,113,0.46)" : "rgba(185,28,28,0.34)",
    destructiveFill: isDark ? "#dc2626" : "#dc2626",
    destructiveForeground: "#ffffff",
    glassBackdrop: isDark ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.1)",
    glassBorder: isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.62)",
    glassHighlight: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.58)",
    glassRim: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.46)",
    glassShadow: neutral.shadow,
    inputBorder: isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.48)",
    inputFill: isDark ? "rgba(32,32,34,0.5)" : "rgba(255,255,255,0.52)",
    menuBackdrop: isDark ? "rgba(0,0,0,0.54)" : "rgba(0,0,0,0.14)",
    menuGlassFill: isDark ? "rgba(28,28,30,0.96)" : "rgba(255,255,255,0.32)",
    monthLabelBorder: isDark ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.82)",
    monthLabelBottomGlow: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.44)",
    monthLabelFill: isDark ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.42)",
    monthLabelRim: isDark ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.72)",
    monthLabelSheen: isDark ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.76)",
    monthLabelTint: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.64)",
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
  nativeCalendarToolbar: {
    height: 136,
    marginBottom: 4
  },
  topActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56
  },
  addButton: {
    alignItems: "center",
    borderRadius: 999,
    flexShrink: 0,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    width: 48
  },
  modalRoot: {
    flex: 1
  },
  noPointerEvents: {
    pointerEvents: "none"
  },
  addMenu: {
    borderCurve: "continuous",
    borderRadius: 31,
    borderWidth: 1,
    overflow: "hidden",
    position: "absolute",
    right: 16,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.36,
    shadowRadius: 38,
    top: 88,
    width: 282
  },
  addMenuHighlight: {
    height: "48%",
    left: 1,
    opacity: 0.46,
    position: "absolute",
    right: 1,
    top: 1
  },
  addMenuContent: {
    paddingVertical: 8
  },
  addMenuAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20,
    height: 64,
    paddingHorizontal: 28
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
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 4
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
  dateBoundaryButton: {
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  dateBoundaryContent: {
    gap: 3,
    zIndex: 1
  },
  dateRangePicker: {
    flexDirection: "row",
    gap: 10
  },
  rangeSelector: {
    gap: 10
  },
  rangeCalendarShell: {
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    padding: 10
  },
  rangeCalendar: {
    backgroundColor: "transparent"
  },
  rangeCalendarPage: {
    backgroundColor: "transparent",
    paddingLeft: 0,
    paddingRight: 0
  },
  rangeCalendarContainer: {
    backgroundColor: "transparent",
    paddingLeft: 0,
    paddingRight: 0
  },
  rangeCalendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 0,
    paddingLeft: 0,
    paddingRight: 0
  },
  rangeCalendarNavButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    overflow: "hidden",
    width: 34
  },
  rangeCalendarMonthText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 14,
    margin: 8
  },
  rangeCalendarArrow: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    padding: 0,
    width: 36
  },
  rangeCalendarWeekHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 4
  },
  rangeCalendarDayHeader: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 16,
    marginBottom: 2,
    marginTop: 0,
    textAlign: "center",
    width: undefined
  },
  rangeCalendarDayContainer: {
    alignItems: "center",
    flex: 1
  },
  rangeCalendarEmptyDayContainer: {
    flex: 1,
    height: 38
  },
  rangeCalendarMonthView: {
    backgroundColor: "transparent"
  },
  rangeCalendarWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 1
  },
  rangeWeekdayRow: {
    flexDirection: "row",
    marginTop: 4
  },
  rangeWeekdayText: {
    flex: 1,
    lineHeight: 16,
    textAlign: "center"
  },
  rangeMonthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2
  },
  rangeDayCell: {
    alignItems: "center",
    flexBasis: "14.2857%",
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "14.2857%"
  },
  rangeDayBand: {
    height: 30,
    opacity: 0.85,
    position: "absolute",
    top: 4
  },
  rangeDayCircle: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  rangeDayFlag: {
    bottom: 0,
    fontSize: 11,
    lineHeight: 12,
    position: "absolute"
  },
  drawerActions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 14,
    marginTop: 22
  },
  nativeActionButton: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: 0
  },
  destructiveAction: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    height: 50,
    justifyContent: "center"
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
  drawerHeaderDeleteButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42
  },
  disabledHeaderButton: {
    opacity: 0.48
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
    paddingBottom: 20,
    paddingTop: 10
  },
  nativeManualSheetContent: {
    flex: 1,
    maxHeight: "100%"
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
    minHeight: 46,
    overflow: "hidden"
  },
  monthPickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  pickerIconButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
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
    borderRadius: 31,
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
  monthPickerYearText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
    lineHeight: 24
  },
  monthRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24
  },
  monthCenterLabel: {
    alignSelf: "center",
    flex: 1,
    height: 48
  },
  monthLabel: {
    alignItems: "center",
    alignSelf: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 1,
    height: 48,
    justifyContent: "center",
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 0,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 22
  },
  monthLabelBottomGlow: {
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    bottom: 0,
    height: "46%",
    left: 1,
    opacity: 0.56,
    position: "absolute",
    right: 1
  },
  monthLabelContent: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minWidth: 0,
    width: "100%",
    zIndex: 1
  },
  monthLabelGlass: {
    borderCurve: "continuous",
    borderRadius: 999,
    overflow: "hidden"
  },
  monthLabelOverlay: {
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    opacity: 1
  },
  monthLabelPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.972 }]
  },
  monthLabelSheen: {
    borderRadius: 999,
    height: 12,
    left: 20,
    opacity: 0.72,
    position: "absolute",
    right: 20,
    top: 7
  },
  monthText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: "center"
  },
  monthButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    width: 48
  },
  roundIconButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.96 }]
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
  monthSummaryTrackedText: {
    flexShrink: 0,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 16
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
  monthSummaryMetricValue: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
    lineHeight: 24
  },
  monthSummaryFooter: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingTop: 10
  },
  monthSummaryCountryStage: {
    alignItems: "stretch",
    flex: 1,
    minWidth: 0
  },
  monthSummaryCountryText: {
    alignSelf: "stretch",
    flexShrink: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
    minWidth: 0,
    textAlign: "left"
  },
  monthSummaryStatusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 16
  },
  nativeCalendarMonthGrid: {
    alignSelf: "center",
    height: 390,
    marginTop: 40
  },
  calendarGrid: {
    marginTop: 0
  },
  weekdayRow: {
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    marginTop: 40,
    paddingHorizontal: 0
  },
  weekdayLabel: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center"
  },
  calendarPage: {
    backgroundColor: "transparent",
    paddingLeft: 0,
    paddingRight: 0
  },
  calendarLibraryContainer: {
    backgroundColor: "transparent",
    paddingLeft: 0,
    paddingRight: 0
  },
  calendarLibraryDayContainer: {
    alignItems: "center",
    flex: 1,
    minHeight: 56
  },
  calendarLibraryDayHeader: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 0,
    marginTop: 0,
    textAlign: "center",
    width: undefined
  },
  calendarLibraryEmptyDayContainer: {
    flex: 1,
    height: 56
  },
  calendarLibraryHiddenHeader: {
    alignItems: "center",
    height: 0,
    marginTop: 0,
    opacity: 0,
    paddingLeft: 0,
    paddingRight: 0
  },
  calendarLibraryMonthView: {
    backgroundColor: "transparent"
  },
  calendarLibraryWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 0
  },
  calendarLibraryWeekHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    marginTop: 24
  },
  dayCell: {
    alignItems: "center",
    flex: 1,
    height: 56,
    justifyContent: "flex-start",
    width: "100%"
  },
  dayNumber: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    width: "100%"
  },
  flagText: {
    fontSize: 17,
    height: 22,
    lineHeight: 22,
    marginTop: 5,
    textAlign: "center",
    width: "100%"
  },
  spacer: {
    flexGrow: 1,
    minHeight: 0
  }
});
