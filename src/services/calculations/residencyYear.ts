import type { AppSettings } from "../../types/models";

export type ResidencyYearWindow = {
  startDate: string;
  endDate: string;
};

type ResidencyYearSettings = Pick<
  AppSettings,
  "calendarYearMode" | "fiscalYearStartDay" | "fiscalYearStartMonth" | "residencyYearEnd"
>;

export function getResidencyYearWindow(settings: ResidencyYearSettings, fallbackYear = new Date().getUTCFullYear()): ResidencyYearWindow {
  const endYear = settings.residencyYearEnd || fallbackYear;
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

export function formatResidencyYearLabel(year: number, calendarYearMode: boolean) {
  if (calendarYearMode) return String(year);
  return `FY ${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
}

export function getResidencyYearDayCount(settings: ResidencyYearSettings) {
  const window = getResidencyYearWindow(settings);
  const start = new Date(`${window.startDate}T00:00:00.000Z`);
  const end = new Date(`${window.endDate}T00:00:00.000Z`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function getResidencyYearMonths(settings: ResidencyYearSettings) {
  const window = getResidencyYearWindow(settings);
  const start = new Date(`${window.startDate}T00:00:00.000Z`);
  const months: Array<{ key: string; year: number; monthIndex: number }> = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  for (let index = 0; index < 12; index += 1) {
    const year = cursor.getUTCFullYear();
    const monthIndex = cursor.getUTCMonth();
    months.push({
      key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      year,
      monthIndex
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}
