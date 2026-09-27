import { addDays, daysBetween, toDate, type DayKey } from "./day";

export type WeightEntry = { date: DayKey; kg: number };

export const MIN_KG = 20;
export const MAX_KG = 300;

/** Parses "84.6", "84,6" or "84.6 kg". Returns null if it isn't a sensible weight. */
export function parseKg(input: string): number | null {
  const n = Number(input.replace(",", ".").replace(/kg/i, "").trim());
  if (!Number.isFinite(n) || n < MIN_KG || n > MAX_KG) return null;
  return Math.round(n * 10) / 10;
}

export const fmtKg = (kg: number) => kg.toFixed(1);

/** "−0.4", "+0.2" or "0.0", with a real minus sign. */
export function fmtDelta(d: number): string {
  if (d <= -0.05) return `−${Math.abs(d).toFixed(1)}`;
  if (d >= 0.05) return `+${d.toFixed(1)}`;
  return "0.0";
}

export type Trend = "down" | "up" | "flat";
export const trendOf = (d: number): Trend => (d <= -0.05 ? "down" : d >= 0.05 ? "up" : "flat");

/** Latest entry on or before a day, from a date-sorted list. */
export function onOrBefore(entries: WeightEntry[], day: DayKey): WeightEntry | undefined {
  let best: WeightEntry | undefined;
  for (const e of entries) {
    if (e.date > day) break;
    best = e;
  }
  return best;
}

/** Average of the entries in the 7 days ending on each entry's date. */
export function withMovingAverage(entries: WeightEntry[]): (WeightEntry & { avg: number })[] {
  return entries.map((e, i) => {
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0 && daysBetween(entries[j].date, e.date) <= 6; j--) {
      sum += entries[j].kg;
      n++;
    }
    return { ...e, avg: sum / n };
  });
}

/** Least-squares slope in kg per day over the last `days` days. */
export function slopePerDay(entries: WeightEntry[], endDay: DayKey, days = 28): number | null {
  const start = addDays(endDay, -days);
  const pts = entries.filter((e) => e.date > start && e.date <= endDay);
  if (pts.length < 5) return null;
  const xs = pts.map((p) => daysBetween(start, p.date));
  const mx = xs.reduce((a, b) => a + b, 0) / pts.length;
  const my = pts.reduce((a, p) => a + p.kg, 0) / pts.length;
  let num = 0;
  let den = 0;
  pts.forEach((p, i) => {
    num += (xs[i] - mx) * (p.kg - my);
    den += (xs[i] - mx) ** 2;
  });
  return den === 0 ? null : num / den;
}

/** The day you'd reach the goal at the current rate, if you're heading towards it. */
export function projectGoalDate(current: WeightEntry, goal: number, slope: number | null): DayKey | null {
  if (slope == null || Math.abs(slope) < 0.005) return null;
  const days = (goal - current.kg) / slope;
  if (days <= 0 || days > 3 * 365) return null;
  return addDays(current.date, Math.round(days));
}

export type Period = "daily" | "weekly" | "monthly";
export type PeriodRow = { key: DayKey; avg: number; count: number; delta: number | null };

/** Monday of the week a day falls in. */
export function weekStart(day: DayKey): DayKey {
  const dow = toDate(day).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

/** Rows newest first, each with its change from the previous period. */
export function groupByPeriod(entries: WeightEntry[], period: Period): PeriodRow[] {
  const groups = new Map<DayKey, number[]>();
  for (const e of entries) {
    const k = period === "daily" ? e.date : period === "weekly" ? weekStart(e.date) : `${e.date.slice(0, 7)}-01`;
    const g = groups.get(k);
    if (g) g.push(e.kg);
    else groups.set(k, [e.kg]);
  }
  const rows = [...groups.entries()].map(([key, v]) => ({
    key,
    avg: v.reduce((a, b) => a + b, 0) / v.length,
    count: v.length,
  }));
  return rows
    .map((r, i) => ({ ...r, delta: i > 0 ? r.avg - rows[i - 1].avg : null }))
    .reverse();
}
