import "server-only";
import { db } from "./db";
import { addDays, today, type DayKey } from "./day";

export type StreakKind = "weight" | "script" | "journal";

export type Streak = {
  /** Consecutive days, including today if it's done. */
  count: number;
  doneToday: boolean;
  /** The longest run ever (within the lookback window). */
  best: number;
};

export type Streaks = Record<StreakKind | "super", Streak>;

const LOOKBACK_DAYS = 1000;

/**
 * Counts back from today. If today isn't done yet the streak is "at risk"
 * rather than broken, so counting starts from yesterday.
 */
export function streakFrom(days: Set<DayKey>, from: DayKey = today()): Streak {
  const doneToday = days.has(from);
  let cursor = doneToday ? from : addDays(from, -1);
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return { count, doneToday, best: Math.max(count, longestRun(days)) };
}

function longestRun(days: Set<DayKey>): number {
  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue; // only count from the start of each run
    let n = 1;
    while (days.has(addDays(d, n))) n++;
    best = Math.max(best, n);
  }
  return best;
}

export async function getStreaks(): Promise<Streaks> {
  const client = await db();
  const since = addDays(today(), -LOOKBACK_DAYS);

  const [weight, script, journal] = await Promise.all([
    client.from("weight_entries").select("date").gte("date", since),
    client.from("goal_scripts").select("date").gte("date", since),
    // Only entries finished on the day itself count (not backdated ones).
    client
      .from("journal_entries")
      .select("date")
      .gte("date", since)
      .not("done_at", "is", null)
      .eq("on_time", true),
  ]);
  for (const r of [weight, script, journal]) if (r.error) throw r.error;

  const toSet = (rows: { date: string }[] | null) => new Set((rows ?? []).map((r) => r.date));
  const w = toSet(weight.data);
  const s = toSet(script.data);
  const j = toSet(journal.data);
  const all = new Set([...w].filter((d) => s.has(d) && j.has(d)));

  return {
    weight: streakFrom(w),
    script: streakFrom(s),
    journal: streakFrom(j),
    super: streakFrom(all),
  };
}
