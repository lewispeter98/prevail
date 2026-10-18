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

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** London calendar date and HH:MM for an instant (no 4am shift). */
export function londonClock(instant: Date): { date: DayKey; hm: string } {
  const p = Object.fromEntries(clockFormat.formatToParts(instant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}

/** The instant a London wall-clock time happens, e.g. ("2026-10-18", "07:30"). */
export function londonInstant(date: DayKey, hm: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, mi);
  const offsetAt = (t: number) => {
    const c = londonClock(new Date(t));
    const [cy, cm, cd] = c.date.split("-").map(Number);
    const [ch, cmi] = c.hm.split(":").map(Number);
    return Date.UTC(cy, cm - 1, cd, ch, cmi) - t;
  };
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t);
  return new Date(t);
}

/** When a logical day starts (4am London). */
export const dayStartInstant = (day: DayKey) => londonInstant(day, "04:00");

/** Good morning / afternoon / evening, by London clock time. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour >= 4 && hour < 12) return "Good morning.";
  if (hour >= 12 && hour < 18) return "Good afternoon.";
  return "Good evening.";
}

/**
 * The current time, for server components. They render once per request, so
 * reading the clock there is safe (the lint rule assumes client re-renders).
 */
export const requestTime = () => Date.now();
