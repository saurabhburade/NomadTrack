import { eachDayOfInterval, endOfDay, isWithinInterval, startOfDay } from "date-fns";
import type { AppSettings, DayRecord } from "../../types/models";

export function getFiscalYearWindow(referenceDate: Date, settings: AppSettings) {
  if (settings.calendarYearMode) {
    const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    return { start, end };
  }

  const monthIndex = settings.fiscalYearStartMonth - 1;
  const startThisYear = new Date(Date.UTC(referenceDate.getUTCFullYear(), monthIndex, settings.fiscalYearStartDay));
  const start =
    referenceDate.getTime() >= startThisYear.getTime()
      ? startThisYear
      : new Date(Date.UTC(referenceDate.getUTCFullYear() - 1, monthIndex, settings.fiscalYearStartDay));
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

export function summarizeIndiaFiscalYear(records: DayRecord[], settings: AppSettings, referenceDate = new Date()) {
  const window = getFiscalYearWindow(referenceDate, settings);
  const inWindow = records.filter((record) =>
    isWithinInterval(new Date(`${record.date}T12:00:00.000Z`), {
      start: startOfDay(window.start),
      end: endOfDay(window.end)
    })
  );

  return {
    startDate: window.start.toISOString().slice(0, 10),
    endDate: window.end.toISOString().slice(0, 10),
    totalDays: eachDayOfInterval({ start: window.start, end: window.end }).length,
    indiaDays: inWindow.filter((record) => record.primaryCountryCode === "IN").length,
    outsideIndiaDays: inWindow.filter((record) => record.primaryCountryCode && record.primaryCountryCode !== "IN").length,
    pendingDays: inWindow.filter((record) => record.isPendingValidation).length
  };
}
