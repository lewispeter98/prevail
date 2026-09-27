/**
 * Prevail's "day" runs from 4am to 4am, London time.
 * Anything done before 4am counts towards the previous day.
 */
export const TIME_ZONE = "Europe/London";
const CUTOFF_HOURS = 4;
const DAY_MS = 86_400_000;

/** A calendar date as YYYY-MM-DD. */
export type DayKey = string;

function londonDateKey(instant: Date): DayKey {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** The logical day an instant belongs to (4am cutoff). */
export function dayOf(instant: Date = new Date()): DayKey {
  return londonDateKey(new Date(instant.getTime() - CUTOFF_HOURS * 3_600_000));
}

export function today(): DayKey {
  return dayOf(new Date());
}

/** Day keys are plain calendar dates, so arithmetic is done at UTC noon. */
export function toDate(key: DayKey): Date {
  return new Date(`${key}T12:00:00Z`);
}

export function addDays(key: DayKey, n: number): DayKey {
  return new Date(toDate(key).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
}

export function formatDay(key: DayKey, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(toDate(key));
}

/** "Sunday 27 September" */
export const longDay = (key: DayKey) =>
  formatDay(key, { weekday: "long", day: "numeric", month: "long" });

/** "Sun 27 Sep" */
export const shortDay = (key: DayKey) =>
  formatDay(key, { weekday: "short", day: "numeric", month: "short" });

/** Good morning / afternoon / evening, by London clock time. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour >= 4 && hour < 12) return "Good morning.";
  if (hour >= 12 && hour < 18) return "Good afternoon.";
  return "Good evening.";
}
