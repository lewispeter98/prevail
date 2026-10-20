import { londonClock, londonInstant, type DayKey } from "./day";

/**
 * Time tracking rules shared by the server and the browser.
 * An entry is the moment you switched activity. It runs until the next entry,
 * capped at 16 hours (anything longer counts as untracked).
 */
export const CAP_MS = 16 * 3_600_000;
export const MIN_MS = 60_000;

export type TimeCategory = { id: string; name: string; colour: string };
export type TimeRule = { id: string; keyword: string; categoryId: string };
export type TimeEntry = { id: string; startedAt: string; label: string; override: string | null };

/** Category colours that read on both the light and dark backgrounds. */
export const SWATCHES = [
  "#3F6B53", "#B07D4F", "#8A8F4E", "#5A6680", "#C49A4A", "#A89C8C", "#B46F5E",
  "#8C6A8A", "#6E8A93", "#A0606A", "#5E8C86", "#9C8455", "#6F7FA6", "#7A8F6B",
];

export const normaliseKeyword = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** The category for a label: a "just this entry" choice wins, then the first matching rule. */
export function categorise(label: string, override: string | null, rules: TimeRule[]): string | null {
  if (override) return override;
  const l = label.toLowerCase();
  return rules.find((r) => l.includes(r.keyword))?.categoryId ?? null;
}

/** When entry i ends, given entries sorted by start. */
export function endOf(entries: TimeEntry[], i: number, now: number): number {
  const start = Date.parse(entries[i].startedAt);
  const next = entries[i + 1] ? Date.parse(entries[i + 1].startedAt) : now;
  return Math.min(next, start + CAP_MS, Math.max(now, start));
}

export function fmtDuration(ms: number): string {
  const m = Math.max(0, Math.round(ms / MIN_MS));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

/** "7h 05", for totals. */
export function fmtHours(minutes: number): string {
  const m = Math.round(minutes);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}`;
}

/** Per-day minutes by category id ("none" for uncategorised). */
export type DailyTotals = Record<string, Record<string, number>>;
export const NONE = "none";

/*
 * Unlike the rest of Prevail (4am to 4am), time tracking uses ordinary calendar
 * days: midnight to midnight, London time.
 */
export const timeDayOf = (instant: Date): DayKey => londonClock(instant).date;
export const timeToday = (): DayKey => timeDayOf(new Date());
export const timeDayStart = (day: DayKey): Date => londonInstant(day, "00:00");
