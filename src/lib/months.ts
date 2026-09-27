import { addDays, formatDay, today, type DayKey } from "./day";

/** First day of the month a day falls in, e.g. 2026-09-01. */
export const monthOf = (day: DayKey): DayKey => `${day.slice(0, 7)}-01`;

export function addMonths(month: DayKey, n: number): DayKey {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

export const lastDayOf = (month: DayKey): DayKey => addDays(addMonths(month, 1), -1);

export const monthName = (month: DayKey, withYear = false) =>
  formatDay(month, withYear ? { month: "long", year: "numeric" } : { month: "long" });

/** Days after a month ends during which its objectives can still be ticked off. */
export const GRACE_DAYS = 3;
/** How many days before a month starts its objectives can be planned. */
export const PLANNING_DAYS = 5;

export type MonthWindow = {
  current: DayKey;
  /** Last month, while it's still in its grace period. */
  grace: DayKey | null;
  /** The last day last month can be ticked off. */
  graceEnds: DayKey | null;
  /** Next month, during the last few days of this one. */
  planning: DayKey | null;
  daysLeft: number;
};

export function monthWindow(day: DayKey = today()): MonthWindow {
  const current = monthOf(day);
  const prev = addMonths(current, -1);
  const graceEnds = addDays(current, GRACE_DAYS - 1);
  const end = lastDayOf(current);
  const daysLeft = Math.round((Date.parse(end) - Date.parse(day)) / 86_400_000);
  return {
    current,
    grace: day <= graceEnds ? prev : null,
    graceEnds: day <= graceEnds ? graceEnds : null,
    planning: daysLeft < PLANNING_DAYS ? addMonths(current, 1) : null,
    daysLeft,
  };
}

/** Months that can still be edited or ticked off today. */
export function openMonths(day: DayKey = today()): DayKey[] {
  const w = monthWindow(day);
  return [w.grace, w.current, w.planning].filter((m): m is DayKey => m != null);
}

/** A month is closed (its score is final) once its grace period has passed. */
export const isClosed = (month: DayKey, day: DayKey = today()) => addDays(addMonths(month, 1), GRACE_DAYS - 1) < day;
