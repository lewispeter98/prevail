"use server";

import { refresh as refreshScreen } from "next/cache";
import { db } from "@/lib/db";
import { londonClock, londonInstant, type DayKey } from "@/lib/day";
import { getCategories, getDailyTotals, getEntriesForDays, getRules } from "@/lib/time";
import { categorise, normaliseKeyword, SWATCHES, timeToday, type DailyTotals, type TimeEntry } from "@/lib/timeCore";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLOUR_RE = /^#[0-9A-Fa-f]{6}$/;
// Re-render just the screen you are on. revalidatePath would empty the whole
// client cache, making every prefetched screen in the app download again after
// each activity switch. Other Time tabs refresh themselves when opened.
const refresh = () => refreshScreen();
const cleanLabel = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 200);

/* ---------- entries ---------- */

/**
 * Starts a new activity, now or at an earlier time today. A time later than
 * now is taken to mean yesterday (e.g. logging "23:30 bed" just after midnight).
 */
export async function logActivity(label: string, hm: string | null): Promise<Result<{ entry: TimeEntry }>> {
  const text = cleanLabel(label);
  if (!text) return { ok: false, error: "Type what you're doing." };
  if (hm != null && !HM_RE.test(hm)) return { ok: false, error: "That time isn't valid." };
  const now = new Date();
  let at = now;
  if (hm) {
    at = londonInstant(londonClock(now).date, hm);
    if (at > now) at = new Date(at.getTime() - 86_400_000);
  }
  const client = await db();
  const { data, error } = await client
    .from("time_entries")
    .insert({ started_at: at.toISOString(), label: text })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, entry: { id: data.id, startedAt: at.toISOString(), label: text, override: null } };
}

/** Adds an entry at a time on any past day (or earlier today), e.g. one you forgot to log. */
export async function addEntryOnDay(day: DayKey, hm: string, label: string): Promise<Result<{ entry: TimeEntry }>> {
  const text = cleanLabel(label);
  if (!text) return { ok: false, error: "Type what you were doing." };
  if (!DATE_RE.test(day) || !HM_RE.test(hm)) return { ok: false, error: "Check the time." };
  const at = londonInstant(day, hm);
  if (at > new Date()) return { ok: false, error: "That time hasn't happened yet." };
  const client = await db();
  const { data, error } = await client
    .from("time_entries")
    .insert({ started_at: at.toISOString(), label: text })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, entry: { id: data.id, startedAt: at.toISOString(), label: text, override: null } };
}

/** Changes an entry's time (keeping its calendar date) and wording. */
export async function updateEntry(id: string, hm: string, label: string): Promise<Result> {
  const text = cleanLabel(label);
  if (!text || !HM_RE.test(hm)) return { ok: false, error: "Check the time and wording." };
  const client = await db();
  const { data: row, error: e1 } = await client.from("time_entries").select("started_at").eq("id", id).single();
  if (e1) return { ok: false, error: e1.message };
  const at = londonInstant(londonClock(new Date(row.started_at)).date, hm);
  if (at > new Date()) return { ok: false, error: "That time is in the future." };
  const { error } = await client.from("time_entries").update({ started_at: at.toISOString(), label: text }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<Result> {
  const client = await db();
  const { error } = await client.from("time_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/* ---------- categorising ---------- */

/** Puts a rule at the top of the list, replacing any rule with the same words. */
async function putRuleFirst(client: Awaited<ReturnType<typeof db>>, keyword: string, categoryId: string) {
  const { data: top, error: e1 } = await client.from("time_rules").select("sort_order").order("sort_order").limit(1);
  if (e1) throw e1;
  const first = (top[0]?.sort_order ?? 0) - 10;
  const { error } = await client
    .from("time_rules")
    .upsert({ keyword, category_id: categoryId, sort_order: first }, { onConflict: "keyword" });
  if (error) throw error;
}

/**
 * Categorises an entry. "all" saves a rule so every past and future entry
 * containing `keyword` goes in this category; "one" changes only this entry.
 */
export async function setEntryCategory(
  entryId: string,
  categoryId: string,
  scope: "one" | "all",
  keyword: string,
): Promise<Result> {
  const client = await db();
  try {
    if (scope === "one") {
      const { error } = await client.from("time_entries").update({ category_override: categoryId }).eq("id", entryId);
      if (error) throw error;
    } else {
      const k = normaliseKeyword(keyword);
      if (!k) return { ok: false, error: "Type the words to match." };
      await putRuleFirst(client, k, categoryId);
      const { error } = await client.from("time_entries").update({ category_override: null }).eq("id", entryId);
      if (error) throw error;
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save that." };
  }
  refresh();
  return { ok: true };
}

/** Saves several "always put X in Y" choices at once (import, or sorting uncategorised activities). */
export async function saveRules(pairs: { keyword: string; categoryId: string }[]): Promise<Result<{ saved: number }>> {
  const client = await db();
  let saved = 0;
  try {
    for (const p of pairs) {
      const k = normaliseKeyword(p.keyword);
      if (!k || !p.categoryId) continue;
      await putRuleFirst(client, k, p.categoryId);
      saved++;
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't save those." };
  }
  refresh();
  return { ok: true, saved };
}

/* ---------- categories & rules (settings) ---------- */

export async function createCategory(name: string, colour: string): Promise<Result<{ id: string }>> {
  const n = name.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!n) return { ok: false, error: "Give the category a name." };
  const c = COLOUR_RE.test(colour) ? colour : SWATCHES[0];
  const client = await db();
  const { data: last } = await client.from("time_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { data, error } = await client
    .from("time_categories")
    .insert({ name: n, colour: c, sort_order: (last?.[0]?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? `You already have a category called ${n}.` : error.message };
  refresh();
  return { ok: true, id: data.id };
}

export async function updateCategory(id: string, changes: { name?: string; colour?: string }): Promise<Result> {
  const patch: Record<string, string> = {};
  if (changes.name != null) {
    const n = changes.name.replace(/\s+/g, " ").trim().slice(0, 40);
    if (!n) return { ok: false, error: "A category needs a name." };
    patch.name = n;
  }
  if (changes.colour != null && COLOUR_RE.test(changes.colour)) patch.colour = changes.colour;
  const client = await db();
  const { error } = await client.from("time_categories").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? "Another category already has that name." : error.message };
  refresh();
  return { ok: true };
}

/** Deletes a category. Its rules go too, and its entries become uncategorised. */
export async function deleteCategory(id: string): Promise<Result> {
  const client = await db();
  const { error } = await client.from("time_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function updateRule(id: string, changes: { keyword?: string; categoryId?: string }): Promise<Result> {
  const patch: Record<string, string> = {};
  if (changes.keyword != null) {
    const k = normaliseKeyword(changes.keyword);
    if (!k) return { ok: false, error: "A rule needs some words to match." };
    patch.keyword = k;
  }
  if (changes.categoryId) patch.category_id = changes.categoryId;
  const client = await db();
  const { error } = await client.from("time_rules").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? "There's already a rule for those words." : error.message };
  refresh();
  return { ok: true };
}

export async function addRule(keyword: string, categoryId: string): Promise<Result> {
  const r = await saveRules([{ keyword, categoryId }]);
  return r.ok ? { ok: true } : r;
}

export async function deleteRule(id: string): Promise<Result> {
  const client = await db();
  const { error } = await client.from("time_rules").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function saveQuickLabels(labels: string[]): Promise<Result> {
  const clean = [...new Set(labels.map((l) => cleanLabel(l).toLowerCase()).filter(Boolean))].slice(0, 12);
  const client = await db();
  const { error } = await client.from("settings").update({ time_quick: clean }).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/* ---------- reads for the Breakdown tab ---------- */

export async function loadDayEntries(day: DayKey): Promise<Result<{ entries: TimeEntry[] }>> {
  if (!DATE_RE.test(day)) return { ok: false, error: "Invalid day." };
  return { ok: true, entries: await getEntriesForDays(await db(), day, day) };
}

export async function loadTotals(from: DayKey, to: DayKey): Promise<Result<{ totals: DailyTotals }>> {
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) return { ok: false, error: "Invalid range." };
  return { ok: true, totals: await getDailyTotals(await db(), from, to) };
}

/* ---------- import from Notes ---------- */

export type ImportDay = { date: DayKey; items: { hm: string; label: string }[] };

/**
 * Imports parsed days. Each time is the London wall-clock time on the date of
 * its heading. Entries that already exist at the same minute are skipped.
 */
export async function importTime(
  days: ImportDay[],
  rules: { keyword: string; categoryId: string }[],
): Promise<Result<{ imported: number; skipped: number }>> {
  const rows = days.flatMap((d) =>
    DATE_RE.test(d.date) && d.date <= timeToday()
      ? d.items
          .filter((it) => HM_RE.test(it.hm) && cleanLabel(it.label))
          .map((it) => ({ started_at: londonInstant(d.date, it.hm).toISOString(), label: cleanLabel(it.label), source: "import" }))
      : [],
  );
  if (rows.length === 0) return { ok: false, error: "Nothing to import." };
  if (rows.length > 10000) return { ok: false, error: "That's too much for one import." };

  const client = await db();
  const times = rows.map((r) => r.started_at).sort();
  const { data: existing, error: e1 } = await client
    .from("time_entries")
    .select("started_at")
    .gte("started_at", times[0])
    .lte("started_at", times[times.length - 1]);
  if (e1) return { ok: false, error: e1.message };
  const have = new Set(existing.map((r) => new Date(r.started_at).toISOString()));
  const fresh = rows.filter((r) => !have.has(r.started_at));

  for (let i = 0; i < fresh.length; i += 500) {
    const { error } = await client.from("time_entries").insert(fresh.slice(i, i + 500));
    if (error) return { ok: false, error: error.message };
  }
  const saved = await saveRules(rules);
  if (!saved.ok) return saved;
  refresh();
  return { ok: true, imported: fresh.length, skipped: rows.length - fresh.length };
}

/** Distinct activities with no category, most frequent first (for the "Sort" list in settings). */
export async function uncategorisedLabels(): Promise<{ label: string; count: number }[]> {
  const client = await db();
  const [rules, { data, error }] = await Promise.all([
    getRules(client),
    client.from("time_entries").select("label").is("category_override", null).limit(10000),
  ]);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const r of data) {
    const k = (r.label as string).trim().toLowerCase();
    if (categorise(k, null, rules)) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

export async function categoriesAndRules() {
  const client = await db();
  const [categories, rules] = await Promise.all([getCategories(client), getRules(client)]);
  return { categories, rules };
}
