import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayKey } from "./day";

export type JournalEntry = {
  date: DayKey;
  feelings: string[];
  body: string;
  doneAt: string | null;
  onTime: boolean;
};

export type WeeklyReview = {
  headline: string;
  progress: string;
  drift: string;
  focus: string;
  affirmation: string;
};

export type Reflection =
  | { kind: "daily"; periodStart: DayKey; content: { text: string }; createdAt: string }
  | { kind: "weekly"; periodStart: DayKey; content: WeeklyReview; createdAt: string };

const ENTRY_COLUMNS = "date, feelings, body, done_at, on_time";

type EntryRow = { date: string; feelings: string[] | null; body: string; done_at: string | null; on_time: boolean };

const toEntry = (r: EntryRow): JournalEntry => ({
  date: r.date,
  feelings: r.feelings ?? [],
  body: r.body,
  doneAt: r.done_at,
  onTime: r.on_time,
});

export async function getEntry(client: SupabaseClient, date: DayKey): Promise<JournalEntry | null> {
  const { data, error } = await client.from("journal_entries").select(ENTRY_COLUMNS).eq("date", date).maybeSingle();
  if (error) throw error;
  return data ? toEntry(data as EntryRow) : null;
}

/** Entries newest first, optionally limited to a date range (inclusive). */
export async function listEntries(
  client: SupabaseClient,
  range: { from?: DayKey; to?: DayKey } = {},
): Promise<JournalEntry[]> {
  const out: JournalEntry[] = [];
  for (let from = 0; ; from += 1000) {
    let q = client.from("journal_entries").select(ENTRY_COLUMNS).order("date", { ascending: false });
    if (range.from) q = q.gte("date", range.from);
    if (range.to) q = q.lte("date", range.to);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    out.push(...(data as EntryRow[]).map(toEntry));
    if (data.length < 1000) break;
  }
  return out;
}

export async function getReflection(
  client: SupabaseClient,
  kind: "daily" | "weekly",
  periodStart: DayKey,
): Promise<Reflection | null> {
  const { data, error } = await client
    .from("reflections")
    .select("kind, period_start, content, created_at")
    .eq("kind", kind)
    .eq("period_start", periodStart)
    .maybeSingle();
  if (error) throw error;
  return data
    ? ({ kind: data.kind, periodStart: data.period_start, content: data.content, createdAt: data.created_at } as Reflection)
    : null;
}

export async function listReflections(client: SupabaseClient, kind: "daily" | "weekly", limit = 60): Promise<Reflection[]> {
  const { data, error } = await client
    .from("reflections")
    .select("kind, period_start, content, created_at")
    .eq("kind", kind)
    .order("period_start", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(
    (d) => ({ kind: d.kind, periodStart: d.period_start, content: d.content, createdAt: d.created_at }) as Reflection,
  );
}

export async function saveReflection(
  client: SupabaseClient,
  kind: "daily" | "weekly",
  periodStart: DayKey,
  content: object,
  model: string,
): Promise<void> {
  const { error } = await client
    .from("reflections")
    .upsert({ kind, period_start: periodStart, content, model, created_at: new Date().toISOString() }, {
      onConflict: "kind,period_start",
    });
  if (error) throw error;
}

/** Active life goals, in order (the Goals module manages them). */
export async function getLifeGoals(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from("life_goals").select("text").eq("active", true).order("sort_order");
  if (error) throw error;
  return data.map((g) => g.text as string);
}
