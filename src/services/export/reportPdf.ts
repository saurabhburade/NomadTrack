import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { Platform } from "react-native";
import { readDayRecordsForDateRange, type DayRecordRow } from "../../db/database";
import { countryBoundaries } from "../../data/countryBoundaries";
import { formatResidencyYearLabel, getResidencyYearWindow } from "../calculations/residencyYear";
import { showReportReadyNotification } from "../notifications/statusNotifications";
import { openPdfFile } from "./pdfOpen";
import type { AppSettings } from "../../types/models";

export type ReportKind = "monthly" | "calendar" | "fiscal";

export type ReportPeriod = {
  kind: ReportKind;
  title: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type ReportResult = {
  title: string;
  uri: string;
  didShare: boolean;
};

export type CountryTotal = {
  countryCode: string;
  countryName: string;
  days: number;
};

export type ReportBreakdownRow = {
  label: string;
  tracked: number;
  india: number;
  abroad: number;
  untracked: number;
};

export type ReportDetailRow = {
  date: string;
  countryCode: string;
  countryName: string;
  status: string;
};

export type ReportCalendarSlot = {
  key: string;
  date?: string;
  countryCode?: string;
  countryName?: string;
};

export type ReportCalendarMonth = {
  key: string;
  label: string;
  slots: ReportCalendarSlot[];
};

export type ReportStats = {
  countryTotals: CountryTotal[];
  coveragePercent: number;
  indiaDays: number;
  monthRows: ReportBreakdownRow[];
  outsideIndiaDays: number;
  pendingDays: number;
  totalDays: number;
  trackedDays: number;
  travelDays: number;
  untrackedDays: number;
};

export type TravelReportPreview = {
  calendarMonths: ReportCalendarMonth[];
  detailRows: ReportDetailRow[];
  detailTitle: string;
  generatedLabel: string;
  period: ReportPeriod;
  rangeLabel: string;
  stats: ReportStats;
};

const countryColors = ["#6ee7b7", "#93c5fd", "#fbbf24", "#fda4af", "#c4b5fd", "#67e8f9", "#fdba74"];
const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const longMonthNames = [
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

export async function createTravelReportPdf({
  kind,
  isDark = true,
  selectedDate,
  settings
}: {
  kind: ReportKind;
  isDark?: boolean;
  selectedDate: string;
  settings: AppSettings;
}): Promise<ReportResult> {
  const report = await prepareTravelReportPreview({ kind, selectedDate, settings });
  return shareTravelReportPdf(report, isDark);
}

export async function prepareTravelReportPreview({
  kind,
  selectedDate,
  settings
}: {
  kind: ReportKind;
  selectedDate: string;
  settings: AppSettings;
}): Promise<TravelReportPreview> {
  const period = getReportPeriod(kind, settings, selectedDate);
  const records = await readDayRecordsForDateRange(period.startDate, period.endDate);
  const stats = summarizeRecords(period, records);
  const recordsByDate = new Map(records.map((record) => [record.date, record]));
  const calendarMonths = enumerateMonthWindows(period.startDate, period.endDate).map((row) => {
    const parsed = parseIsoDateParts(row.startDate);
    const slots = buildMonthSlots(parsed.year, parsed.monthIndex).map((slot) => {
      if (!slot.date || slot.date < period.startDate || slot.date > period.endDate) return slot;

      const record = recordsByDate.get(slot.date);
      return {
        ...slot,
        countryCode: record?.primary_country_code ?? undefined,
        countryName: record?.primary_country_name ?? undefined
      };
    });

    return {
      key: row.startDate.slice(0, 7),
      label: row.label,
      slots
    };
  });
  const rangeLabel = `${formatDisplayDate(period.startDate)} - ${formatDisplayDate(period.endDate)}`;
  const generatedLabel = formatDisplayDate(new Date().toISOString().slice(0, 10));
  const detailRows = buildDailyRows(period, records);
  const detailTitle = "Daily Log";

  return {
    calendarMonths,
    detailRows,
    detailTitle,
    generatedLabel,
    period,
    rangeLabel,
    stats
  };
}

export async function shareTravelReportPdf(report: TravelReportPreview, isDark = true): Promise<ReportResult> {
  const html = buildReportHtml(report, isDark);
  const title = `${report.period.title} - ${report.period.label}`;

  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return { title, uri: "", didShare: true };
  }

  const printed = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
    margins: { top: 24, right: 24, bottom: 24, left: 24 }
  });
  const uri = await moveReportFile(printed.uri, `${report.period.title} ${report.period.label}`);
  let didShare = false;
  await showReportReadyNotification(title, uri);

  didShare = await openPdfFile(uri, title);

  return { title, uri, didShare };
}

function getReportPeriod(kind: ReportKind, settings: AppSettings, selectedDate: string): ReportPeriod {
  if (kind === "monthly") {
    const startDate = selectedDate.slice(0, 8) + "01";
    return {
      kind,
      title: "Monthly Travel Report",
      label: formatMonthYear(startDate),
      startDate,
      endDate: addIsoMonths(startDate, 1, -1)
    };
  }

  if (kind === "calendar") {
    const year = settings.residencyYearEnd || new Date().getUTCFullYear();
    return {
      kind,
      title: "Calendar Year Report",
      label: String(year),
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };
  }

  const fiscalSettings = {
    ...settings,
    calendarYearMode: false,
    fiscalYearStartMonth: 4,
    fiscalYearStartDay: 1
  };
  const window = getResidencyYearWindow(fiscalSettings);
  return {
    kind,
    title: "Fiscal Year Report",
    label: formatResidencyYearLabel(fiscalSettings.residencyYearEnd, false),
    startDate: window.startDate,
    endDate: window.endDate
  };
}

function buildReportHtml(report: TravelReportPreview, isDark: boolean) {
  const { detailRows, detailTitle, generatedLabel, period, rangeLabel, stats } = report;
  const colors = getReportColors(isDark);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { margin: 24px; size: A4; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: ${colors.screen};
      color: ${colors.foreground};
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { padding: 24px; }
    .hero {
      border: 1px solid ${colors.border};
      border-radius: 24px;
      padding: 26px;
      background: ${colors.hero};
    }
    .eyebrow { color: ${colors.muted}; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 10px 0 0; font-size: 34px; line-height: 1.05; letter-spacing: 0; }
    .range { margin-top: 10px; color: ${colors.section}; font-size: 14px; }
    .meta { margin-top: 22px; display: flex; gap: 12px; color: ${colors.muted}; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px; }
    .card {
      border: 1px solid ${colors.border};
      border-radius: 18px;
      background: ${colors.card};
      padding: 15px;
      min-height: 88px;
    }
    .label { color: ${colors.muted}; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .value { margin-top: 8px; color: ${colors.foreground}; font-size: 26px; font-weight: 800; }
    .unit { color: ${colors.muted}; font-size: 14px; font-weight: 600; }
    .section { margin-top: 20px; }
    .detail-page {
      break-before: page;
      page-break-before: always;
    }
    .detail-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
    }
    .detail-page-count {
      color: ${colors.muted};
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    h2 { margin: 0 0 12px; font-size: 18px; line-height: 1.2; }
    .two-col { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 14px; }
    .panel {
      border: 1px solid ${colors.border};
      border-radius: 20px;
      background: ${colors.panel};
      padding: 18px;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .bar-row { display: grid; grid-template-columns: 92px 1fr 44px; gap: 10px; align-items: center; margin-top: 12px; }
    .bar-label { color: ${colors.foreground}; font-size: 12px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .track { height: 11px; overflow: hidden; border-radius: 999px; background: ${colors.track}; }
    .fill { height: 100%; border-radius: 999px; }
    .bar-value { color: ${colors.section}; font-size: 12px; font-weight: 700; text-align: right; }
    table { width: 100%; border-collapse: collapse; border-spacing: 0; }
    th, td { padding: 10px 12px; border-bottom: 1px solid ${colors.border}; font-size: 12px; text-align: left; }
    th { color: ${colors.muted}; font-size: 10px; font-weight: 800; text-transform: uppercase; background: ${colors.tableHeader}; }
    td { color: ${colors.foreground}; background: ${colors.tableCell}; }
    tr:last-child td { border-bottom: 0; }
    thead { display: table-header-group; }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .right { text-align: right; }
    .muted { color: ${colors.muted}; }
    .pill {
      display: inline-block;
      min-width: 34px;
      border-radius: 999px;
      padding: 4px 8px;
      background: ${colors.track};
      color: ${colors.foreground};
      font-size: 11px;
      font-weight: 800;
      text-align: center;
    }
    .empty {
      border: 1px dashed ${colors.border};
      border-radius: 16px;
      padding: 18px;
      color: ${colors.muted};
      font-size: 13px;
      text-align: center;
      background: ${colors.card};
    }
    .calendar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px 20px;
    }
    .month { break-inside: avoid; }
    .month-name {
      color: ${colors.section};
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 9px;
    }
    .dots {
      display: grid;
      grid-template-columns: repeat(7, 8px);
      gap: 5px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
    }
    .world-map {
      width: 100%;
      overflow: hidden;
      border-radius: 18px;
      background: ${colors.mapOcean};
      border: 1px solid ${colors.border};
    }
    .world-map svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .world-map path {
      vector-effect: non-scaling-stroke;
    }
    .map-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 14px;
      margin-top: 12px;
      color: ${colors.muted};
      font-size: 11px;
      font-weight: 700;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-swatch {
      width: 11px;
      height: 11px;
      border-radius: 999px;
      border: 1px solid ${colors.border};
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="eyebrow">NomadTrack</div>
      <h1>${escapeHtml(period.title)}</h1>
      <div class="range">${escapeHtml(period.label)} - ${escapeHtml(rangeLabel)}</div>
      <div class="meta">
        <span>Generated ${escapeHtml(generatedLabel)}</span>
        <span>${stats.totalDays} days in period</span>
        <span>${stats.trackedDays} tracked</span>
      </div>
    </section>

    <section class="grid avoid-break">
      ${metricCard("India Days", stats.indiaDays, "days")}
      ${metricCard("Abroad", stats.outsideIndiaDays, "days")}
      ${metricCard("Countries", stats.countryTotals.length, "visited")}
      ${metricCard("Untracked", stats.untrackedDays, "days")}
    </section>

    <section class="section panel">
      <h2>Travel Calendar</h2>
      ${calendarDots(report, colors)}
    </section>

    <section class="section two-col avoid-break">
      <div class="panel avoid-break">
        <h2>Country Breakdown</h2>
        ${countryBars(stats.countryTotals, stats.trackedDays)}
      </div>
      <div class="panel avoid-break">
        <h2>Compliance Snapshot</h2>
        <table>
          <tbody>
            ${snapshotRow("Period length", `${stats.totalDays} days`)}
            ${snapshotRow("Tracked coverage", `${stats.coveragePercent}%`)}
            ${snapshotRow("Travel days", `${stats.travelDays}`)}
            ${snapshotRow("Pending validation", `${stats.pendingDays}`)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section panel">
      <h2>${period.kind === "monthly" ? "Week Breakdown" : "Monthly Breakdown"}</h2>
      ${monthBreakdownTable(stats.monthRows)}
    </section>

    <section class="section panel avoid-break">
      <h2>World Heatmap</h2>
      ${worldChoroplethMap(report, colors)}
    </section>

    ${dailyRowsPages(detailTitle, detailRows)}
  </main>
</body>
</html>`;
}

function summarizeRecords(period: ReportPeriod, records: DayRecordRow[]): ReportStats {
  const totalDays = getInclusiveDayCount(period.startDate, period.endDate);
  const countryTotalsByCode = new Map<string, CountryTotal>();
  let indiaDays = 0;
  let outsideIndiaDays = 0;
  let travelDays = 0;
  let pendingDays = 0;

  for (const record of records) {
    if (record.is_travel_day === 1) travelDays += 1;
    if (record.is_pending_validation === 1) pendingDays += 1;

    if (!record.primary_country_code) continue;
    const countryCode = record.primary_country_code;
    const countryName = record.primary_country_name ?? countryCode;
    const existing = countryTotalsByCode.get(countryCode) ?? { countryCode, countryName, days: 0 };
    existing.days += 1;
    countryTotalsByCode.set(countryCode, existing);

    if (countryCode === "IN") {
      indiaDays += 1;
    } else {
      outsideIndiaDays += 1;
    }
  }

  const trackedDays = indiaDays + outsideIndiaDays;
  const countryTotals: CountryTotal[] = [];
  countryTotalsByCode.forEach((row) => countryTotals.push(row));
  countryTotals.sort((a, b) => b.days - a.days || a.countryName.localeCompare(b.countryName));

  return {
    countryTotals,
    coveragePercent: totalDays > 0 ? Math.round((trackedDays / totalDays) * 100) : 0,
    indiaDays,
    monthRows: buildMonthRows(period, records),
    outsideIndiaDays,
    pendingDays,
    totalDays,
    trackedDays,
    travelDays,
    untrackedDays: Math.max(0, totalDays - trackedDays)
  };
}

function metricCard(label: string, value: number, unit: string) {
  return `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${formatNumber(value)} <span class="unit">${escapeHtml(unit)}</span></div></div>`;
}

function snapshotRow(label: string, value: string) {
  return `<tr><td>${escapeHtml(label)}</td><td class="right">${escapeHtml(value)}</td></tr>`;
}

function countryBars(countryTotals: CountryTotal[], trackedDays: number) {
  if (countryTotals.length === 0) {
    return `<div class="empty">No tracked country days in this period.</div>`;
  }

  return countryTotals
    .slice(0, 7)
    .map((row, index) => {
      const color = countryColors[index % countryColors.length] ?? countryColors[0]!;
      const width = trackedDays > 0 ? Math.max(4, Math.round((row.days / trackedDays) * 100)) : 0;
      return `<div class="bar-row">
        <div class="bar-label">${escapeHtml(row.countryName)}</div>
        <div class="track"><div class="fill" style="width:${width}%; background:${color};"></div></div>
        <div class="bar-value">${formatNumber(row.days)}</div>
      </div>`;
    })
    .join("");
}

function calendarDots(report: TravelReportPreview, colors: ReturnType<typeof getReportColors>) {
  const colorByCountry = buildReportColorByCountry(report.stats.countryTotals);

  return `<div class="calendar">
    ${report.calendarMonths
      .map(
        (month) => `<div class="month">
          <div class="month-name">${escapeHtml(month.label)}</div>
          <div class="dots">
            ${month.slots
              .map((slot) => {
                if (!slot.date) return `<div class="dot" style="background: transparent;"></div>`;
                const color = slot.countryCode ? colorByCountry.get(slot.countryCode) ?? countryColors[6]! : colors.track;
                return `<div class="dot" title="${escapeHtml(slot.date)}" style="background: ${color};"></div>`;
              })
              .join("")}
          </div>
        </div>`
      )
      .join("")}
  </div>`;
}

function monthBreakdownTable(rows: ReportBreakdownRow[]) {
  if (rows.length === 0) return `<div class="empty">No dates available for this report period.</div>`;

  return `<table>
    <thead><tr><th>Duration</th><th class="right">Tracked</th><th class="right">India</th><th class="right">Abroad</th><th class="right">Untracked</th></tr></thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>
            <td>${escapeHtml(row.label)}</td>
            <td class="right">${formatNumber(row.tracked)}</td>
            <td class="right">${formatNumber(row.india)}</td>
            <td class="right">${formatNumber(row.abroad)}</td>
            <td class="right muted">${formatNumber(row.untracked)}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function dailyRowsTable(rows: ReportDetailRow[]) {
  if (rows.length === 0) return `<div class="empty">No tracked days to show yet.</div>`;

  return `<table>
    <thead><tr><th>Date</th><th>Country</th><th>Status</th></tr></thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>
            <td>${escapeHtml(formatDisplayDate(row.date))}</td>
            <td><span class="pill">${escapeHtml(row.countryCode)}</span> ${escapeHtml(row.countryName)}</td>
            <td>${escapeHtml(row.status)}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function dailyRowsPages(title: string, rows: ReportDetailRow[]) {
  if (rows.length === 0) {
    return `<section class="section panel detail-page">
      <h2>${escapeHtml(title)}</h2>
      ${dailyRowsTable(rows)}
    </section>`;
  }

  const pages = chunkRows(rows, 15);
  return pages
    .map(
      (pageRows, index) => `<section class="section panel detail-page">
        <div class="detail-heading">
          <h2>${escapeHtml(title)}</h2>
          <div class="detail-page-count">Page ${index + 1} of ${pages.length}</div>
        </div>
        ${dailyRowsTable(pageRows)}
      </section>`
    )
    .join("");
}

function worldChoroplethMap(report: TravelReportPreview, colors: ReturnType<typeof getReportColors>) {
  const totalsByCode = new Map(report.stats.countryTotals.map((row) => [row.countryCode, row]));
  const maxDays = Math.max(1, ...report.stats.countryTotals.map((row) => row.days));
  const paths = Object.entries(countryBoundaries)
    .filter(([countryCode]) => countryCode !== "AQ")
    .flatMap(([countryCode, boundary]) => {
      const total = totalsByCode.get(countryCode);
      const fill = total ? interpolateHexColor(colors.mapHeatLow, colors.mapHeatHigh, total.days / maxDays) : colors.mapUntracked;
      const opacity = total ? 0.94 : 0.46;
      return boundary.polygons
        .map((polygon) => polygonToSvgPath(polygon))
        .filter(Boolean)
        .map((path) => `<path d="${path}" fill="${fill}" fill-opacity="${opacity}" stroke="${colors.mapStroke}" stroke-width="0.45" />`);
    })
    .join("");

  return `<div class="world-map">
    <svg viewBox="0 0 720 330" role="img" aria-label="World country heatmap">
      ${paths}
    </svg>
  </div>
  ${worldMapLegend(report.stats.countryTotals, colors, maxDays)}`;
}

function worldMapLegend(countryTotals: CountryTotal[], colors: ReturnType<typeof getReportColors>, maxDays: number) {
  if (countryTotals.length === 0) {
    return `<div class="map-legend"><span>No tracked countries in this period.</span></div>`;
  }

  return `<div class="map-legend">
    ${countryTotals
      .slice(0, 5)
      .map((row) => {
        const color = interpolateHexColor(colors.mapHeatLow, colors.mapHeatHigh, row.days / maxDays);
        return `<span class="legend-item"><span class="legend-swatch" style="background:${color};"></span>${escapeHtml(row.countryName)} ${formatNumber(row.days)}</span>`;
      })
      .join("")}
  </div>`;
}

function polygonToSvgPath(polygon: Array<[number, number]>) {
  if (polygon.length < 3) return "";
  const [first, ...rest] = polygon.map(projectLonLat);
  if (!first) return "";
  return `M${first.x} ${first.y}${rest.map((point) => `L${point.x} ${point.y}`).join("")}Z`;
}

function projectLonLat([longitude, latitude]: [number, number]) {
  const clampedLatitude = Math.max(-60, Math.min(85, latitude));
  const x = roundSvgNumber(((longitude + 180) / 360) * 720);
  const y = roundSvgNumber(((85 - clampedLatitude) / 145) * 330);
  return { x, y };
}

function roundSvgNumber(value: number) {
  return Math.round(value * 10) / 10;
}

function interpolateHexColor(start: string, end: string, progress: number) {
  const amount = Math.max(0, Math.min(1, progress));
  const startRgb = parseHexColor(start);
  const endRgb = parseHexColor(end);
  const channel = (from: number, to: number) => Math.round(from + (to - from) * amount);
  return `rgb(${channel(startRgb.r, endRgb.r)}, ${channel(startRgb.g, endRgb.g)}, ${channel(startRgb.b, endRgb.b)})`;
}

function parseHexColor(value: string) {
  const normalized = value.replace("#", "");
  const expanded = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
  const number = Number.parseInt(expanded, 16);
  return {
    b: number & 255,
    g: (number >> 8) & 255,
    r: (number >> 16) & 255
  };
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function buildMonthRows(period: ReportPeriod, records: DayRecordRow[]) {
  const rows: Array<{ label: string; startDate: string; endDate: string }> =
    period.kind === "monthly" ? enumerateWeekWindows(period.startDate, period.endDate) : enumerateMonthWindows(period.startDate, period.endDate);
  const recordsByDate = new Map(records.map((record) => [record.date, record]));

  return rows.map((row) => {
    let india = 0;
    let abroad = 0;
    for (const date of enumerateIsoDates(row.startDate, row.endDate)) {
      const record = recordsByDate.get(date);
      if (!record?.primary_country_code) continue;
      if (record.primary_country_code === "IN") {
        india += 1;
      } else {
        abroad += 1;
      }
    }

    const periodDays = getInclusiveDayCount(row.startDate, row.endDate);
    const tracked = india + abroad;
    return {
      label: row.label,
      abroad,
      india,
      tracked,
      untracked: Math.max(0, periodDays - tracked)
    };
  });
}

function buildMonthSlots(year: number, monthIndex: number): ReportCalendarSlot[] {
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const slots: ReportCalendarSlot[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    slots.push({ key: `empty-${year}-${monthIndex}-${index}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    slots.push({ key: date, date });
  }

  return slots;
}

function buildReportColorByCountry(countryTotals: CountryTotal[]) {
  const colorByCountry = new Map<string, string>();
  countryTotals.slice(0, countryColors.length).forEach((row, index) => {
    colorByCountry.set(row.countryCode, countryColors[index] ?? countryColors[0]!);
  });
  return colorByCountry;
}

function buildDailyRows(period: ReportPeriod, records: DayRecordRow[]) {
  const recordsByDate = new Map(records.map((record) => [record.date, record]));
  return enumerateIsoDates(period.startDate, period.endDate).map((date) => {
    const record = recordsByDate.get(date);
    return formatDetailRow(date, record);
  });
}

function formatDetailRow(date: string, record?: DayRecordRow) {
  if (!record?.primary_country_code) {
    return {
      date,
      countryCode: "--",
      countryName: "Untracked",
      status: record?.is_pending_validation === 1 ? "Pending validation" : "No location"
    };
  }

  return {
    date,
    countryCode: record.primary_country_code,
    countryName: record.primary_country_name ?? record.primary_country_code,
    status: record.is_travel_day === 1 ? "Travel day" : record.is_manual_override === 1 ? "Manual" : "Tracked"
  };
}

function enumerateWeekWindows(startDate: string, endDate: string) {
  const rows: Array<{ label: string; startDate: string; endDate: string }> = [];
  let cursor = startDate;
  let index = 1;
  while (cursor <= endDate) {
    const rowEnd = minIsoDate(addIsoDays(cursor, 6), endDate);
    rows.push({
      label: `Week ${index}`,
      startDate: cursor,
      endDate: rowEnd
    });
    cursor = addIsoDays(rowEnd, 1);
    index += 1;
  }
  return rows;
}

function enumerateMonthWindows(startDate: string, endDate: string) {
  const rows: Array<{ label: string; startDate: string; endDate: string }> = [];
  let cursor = startDate.slice(0, 8) + "01";

  while (cursor <= endDate) {
    const rowStart = maxIsoDate(cursor, startDate);
    const rowEnd = minIsoDate(addIsoMonths(cursor, 1, -1), endDate);
    rows.push({
      label: formatShortMonth(rowStart),
      startDate: rowStart,
      endDate: rowEnd
    });
    cursor = addIsoMonths(cursor, 1);
  }

  return rows;
}

function enumerateIsoDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addIsoDays(cursor, 1);
  }
  return dates;
}

function addIsoDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function addIsoMonths(date: string, months: number, days = 0) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCMonth(next.getUTCMonth() + months);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function getInclusiveDayCount(startDate: string, endDate: string) {
  return Math.round((new Date(`${endDate}T00:00:00.000Z`).getTime() - new Date(`${startDate}T00:00:00.000Z`).getTime()) / 86_400_000) + 1;
}

function maxIsoDate(left: string, right: string) {
  return left > right ? left : right;
}

function minIsoDate(left: string, right: string) {
  return left < right ? left : right;
}

function formatDisplayDate(date: string) {
  const parsed = parseIsoDateParts(date);
  return `${parsed.day} ${shortMonthNames[parsed.monthIndex] ?? ""} ${parsed.year}`;
}

function formatMonthYear(date: string) {
  const parsed = parseIsoDateParts(date);
  return `${longMonthNames[parsed.monthIndex] ?? ""} ${parsed.year}`;
}

function formatShortMonth(date: string) {
  const parsed = parseIsoDateParts(date);
  return `${shortMonthNames[parsed.monthIndex] ?? ""} '${String(parsed.year).slice(-2)}`;
}

function formatNumber(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseIsoDateParts(date: string) {
  return {
    day: Number(date.slice(8, 10)),
    monthIndex: Math.max(0, Math.min(11, Number(date.slice(5, 7)) - 1)),
    year: Number(date.slice(0, 4))
  };
}

async function moveReportFile(uri: string, title: string) {
  const directory = FileSystem.documentDirectory;
  if (!directory) return uri;

  const targetUri = `${directory}${sanitizeFileName(title)}.pdf`;
  try {
    const existing = await FileSystem.getInfoAsync(targetUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(targetUri, { idempotent: true });
    }
    await FileSystem.moveAsync({ from: uri, to: targetUri });
    return targetUri;
  } catch {
    return uri;
  }
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getReportColors(isDark: boolean) {
  if (isDark) {
    return {
      border: "#e5e7eb",
      card: "#ffffff",
      foreground: "#18181b",
      hero: "linear-gradient(135deg, #ffffff 0%, #f7f8fb 58%, #eef2f7 100%)",
      mapHeatHigh: "#0f766e",
      mapHeatLow: "#99f6e4",
      mapOcean: "#ffffff",
      mapStroke: "#d6d3d1",
      mapUntracked: "#f8fafc",
      muted: "#71717a",
      panel: "#ffffff",
      screen: "#ffffff",
      section: "#52525b",
      tableCell: "#ffffff",
      tableHeader: "#f8fafc",
      track: "#e5e7eb"
    };
  }

  return {
    border: "#e5e7eb",
    card: "#ffffff",
    foreground: "#18181b",
    hero: "linear-gradient(135deg, #ffffff 0%, #f7f8fb 58%, #eef2f7 100%)",
    mapHeatHigh: "#0f766e",
    mapHeatLow: "#99f6e4",
    mapOcean: "#ffffff",
    mapStroke: "#d6d3d1",
    mapUntracked: "#f8fafc",
    muted: "#71717a",
    panel: "#ffffff",
    screen: "#ffffff",
    section: "#52525b",
    tableCell: "#ffffff",
    tableHeader: "#f8fafc",
    track: "#e5e7eb"
  };
}
