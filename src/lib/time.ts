import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, dayStartInstant, today, type DayKey } from "./day";
import { streakFrom, type Streak } from "./streaks";
import { CAP_MS, NONE, type DailyTotals, type TimeCategory, type TimeEntry, type TimeRule } from "./timeCore";

export async function getCategories(client: SupabaseClient): Promise<TimeCategory[]> {
  const { data, error } = await client
    .from("time_categories")
    .select("id, name, colour")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data as TimeCategory[];
}

export async function getRules(client: SupabaseClient): Promise<(TimeRule & { sortOrder: number })[]> {
  const { data, error } = await client
    .from("time_rules")
    .select("id, keyword, category_id, sort_order")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data.map((r) => ({ id: r.id, keyword: r.keyword, categoryId: r.category_id, sortOrder: r.sort_order }));
}

type EntryRow = { id: string; started_at: string; label: string; category_override: string | null };
const toEntry = (r: EntryRow): TimeEntry => ({
  id: r.id,
  startedAt: r.started_at,
  label: r.label,
  override: r.category_override,
});
const COLS = "id, started_at, label, category_override";

/**
 * Entries for logical days `from`..`to`, plus whatever was still running when
 * `from` began and the first entry after `to` (so every duration is known).
 */
export async function getEntriesForDays(client: SupabaseClient, from: DayKey, to: DayKey): Promise<TimeEntry[]> {
  const t0 = dayStartInstant(from).toISOString();
  const t1 = dayStartInstant(addDays(to, 1)).toISOString();
  const [before, inside, after] = await Promise.all([
    client
      .from("time_entries")
      .select(COLS)
      .lt("started_at", t0)
      .gte("started_at", new Date(Date.parse(t0) - CAP_MS).toISOString())
      .order("started_at", { ascending: false })
      .limit(1),
    client.from("time_entries").select(COLS).gte("started_at", t0).lt("started_at", t1).order("started_at").limit(5000),
    client.from("time_entries").select(COLS).gte("started_at", t1).order("started_at").limit(1),
  ]);
  for (const r of [before, inside, after]) if (r.error) throw r.error;
  return [...(before.data ?? []), ...(inside.data ?? []), ...(after.data ?? [])].map((r) => toEntry(r as EntryRow));
}

/** Minutes per category per logical day, worked out in the database. */
export async function getDailyTotals(client: SupabaseClient, from: DayKey, to: DayKey): Promise<DailyTotals> {
  const out: DailyTotals = {};
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .rpc("time_daily_totals", { p_from: from, p_to: to })
      .range(offset, offset + 999);
    if (error) throw error;
    for (const r of data as { day: string; category_id: string | null; minutes: number }[]) {
      (out[r.day] ??= {})[r.category_id ?? NONE] = Number(r.minutes);
    }
    if (data.length < 1000) break;
  }
  return out;
}

export async function getQuickLabels(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from("settings").select("time_quick").eq("id", 1).single();
  if (error) throw error;
  const saved = (data.time_quick as string[]) ?? [];
  if (saved.length) return saved;
  // The buttons must never move around, so until there's enough history they're
  // a fixed default set. Once there is, your most frequent activities are saved
  // once and only change when you edit them in settings.
  const defaults = ["work", "break", "family time", "dog walk", "dinner", "gym", "sleep", "bed"];
  const since = dayStartInstant(addDays(today(), -30)).toISOString();
  const { data: recent, error: e2 } = await client.from("time_entries").select("label").gte("started_at", since).limit(3000);
  if (e2) throw e2;
  if (recent.length < 40) return defaults;
  const counts = new Map<string, number>();
  for (const r of recent) {
    const k = (r.label as string).trim().toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const chosen = [...new Set([...top, ...defaults])].slice(0, 8);
  await client.from("settings").update({ time_quick: chosen }).eq("id", 1);
  return chosen;
}

/** A day counts towards the Time streak when at least 12 of its 24 hours are logged. */
export const STREAK_MINUTES = 12 * 60;

export async function getTimeStreak(client: SupabaseClient): Promise<Streak> {
  const end = today();
  const totals = await getDailyTotals(client, addDays(end, -180), end);
  const done = new Set(
    Object.entries(totals)
      .filter(([, cats]) => Object.values(cats).reduce((a, b) => a + b, 0) >= STREAK_MINUTES)
      .map(([d]) => d),
  );
  return streakFrom(done, end);
}
