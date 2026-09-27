"use server";

import { revalidatePath } from "next/cache";
import { MODEL, ReflectionError, writeDailyReflection } from "@/lib/ai";
import { db } from "@/lib/db";
import { longDay, today, type DayKey } from "@/lib/day";
import { isFeeling } from "@/lib/feelings";
import { getEntry, getLifeGoals, saveReflection } from "@/lib/journal";
import { createWeeklyReview } from "@/lib/weeklyReview";
import { weekStart } from "@/lib/weightStats";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (d: string) => DATE_RE.test(d) && d <= today();

const refresh = () => revalidatePath("/", "layout");

/** Autosave. Doesn't touch "done" status, so it never changes streaks. */
export async function saveEntry(date: DayKey, feelings: string[], body: string): Promise<Result> {
  if (!validDate(date)) return { ok: false, error: "That date isn't valid." };
  const client = await db();
  const { error } = await client
    .from("journal_entries")
    .upsert({ date, feelings: feelings.filter(isFeeling), body }, { onConflict: "date" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function reflect(date: DayKey): Promise<Result<{ reflection: string }>> {
  const client = await db();
  const [entry, lifeGoals] = await Promise.all([getEntry(client, date), getLifeGoals(client)]);
  if (!entry) return { ok: false, error: "There's no entry for that day yet." };
  try {
    const text = await writeDailyReflection({
      dateLabel: longDay(date),
      feelings: entry.feelings,
      body: entry.body,
      lifeGoals,
    });
    await saveReflection(client, "daily", date, { text }, MODEL);
    return { ok: true, reflection: text };
  } catch (err) {
    return { ok: false, error: err instanceof ReflectionError ? err.message : "Couldn't write a reflection." };
  }
}

/**
 * "Done for today": saves the entry, marks it done (counting towards the streak
 * only if it's for today) and writes the short reflection.
 */
export async function finishEntry(
  date: DayKey,
  feelings: string[],
  body: string,
): Promise<Result<{ reflection: string | null; reflectionError?: string }>> {
  if (!validDate(date)) return { ok: false, error: "That date isn't valid." };
  if (!body.trim() && feelings.length === 0) return { ok: false, error: "Pick a feeling or write something first." };
  const client = await db();
  const existing = await getEntry(client, date);
  const { error } = await client.from("journal_entries").upsert(
    {
      date,
      feelings: feelings.filter(isFeeling),
      body,
      done_at: existing?.doneAt ?? new Date().toISOString(),
      on_time: existing?.onTime || date === today(),
    },
    { onConflict: "date" },
  );
  if (error) return { ok: false, error: error.message };
  refresh();
  const r = await reflect(date);
  return r.ok ? { ok: true, reflection: r.reflection } : { ok: true, reflection: null, reflectionError: r.error };
}

export async function regenerateReflection(date: DayKey): Promise<Result<{ reflection: string }>> {
  if (!validDate(date)) return { ok: false, error: "That date isn't valid." };
  const r = await reflect(date);
  if (r.ok) refresh();
  return r;
}

export async function deleteEntry(date: DayKey): Promise<Result> {
  if (!DATE_RE.test(date)) return { ok: false, error: "That date isn't valid." };
  const client = await db();
  const [a, b] = await Promise.all([
    client.from("journal_entries").delete().eq("date", date),
    client.from("reflections").delete().eq("kind", "daily").eq("period_start", date),
  ]);
  const error = a.error ?? b.error;
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function generateWeeklyReview(monday: DayKey): Promise<Result> {
  if (!DATE_RE.test(monday) || weekStart(monday) !== monday || monday > today()) {
    return { ok: false, error: "That week isn't valid." };
  }
  try {
    await createWeeklyReview(await db(), monday);
  } catch (err) {
    return { ok: false, error: err instanceof ReflectionError ? err.message : "Couldn't write the weekly review." };
  }
  refresh();
  return { ok: true };
}

export type ImportMode = "skip" | "replace" | "append";

/** Imports entries parsed from Apple Notes. Imported days count towards the streak. */
export async function importEntries(
  entries: { date: DayKey; body: string }[],
  mode: ImportMode,
): Promise<Result<{ imported: number; skipped: number }>> {
  const clean = entries.filter((e) => validDate(e.date) && typeof e.body === "string");
  if (clean.length === 0) return { ok: false, error: "No valid entries to import." };
  if (clean.length > 5000) return { ok: false, error: "That's too many entries for one import." };

  const client = await db();
  const existing = new Map<string, { body: string; feelings: string[]; done_at: string | null }>();
  for (let i = 0; i < clean.length; i += 300) {
    const { data, error } = await client
      .from("journal_entries")
      .select("date, body, feelings, done_at")
      .in("date", clean.slice(i, i + 300).map((e) => e.date));
    if (error) return { ok: false, error: error.message };
    for (const d of data) existing.set(d.date as string, d);
  }

  let skipped = 0;
  const rows = clean.flatMap((e) => {
    const old = existing.get(e.date);
    if (old && mode === "skip") {
      skipped++;
      return [];
    }
    const body = old && mode === "append" ? [old.body, e.body].filter(Boolean).join("\n\n") : e.body;
    return [
      {
        date: e.date,
        body,
        feelings: old?.feelings ?? [],
        done_at: old?.done_at ?? `${e.date}T20:00:00Z`,
        on_time: true,
        source: old ? "app" : "import",
      },
    ];
  });

  for (let i = 0; i < rows.length; i += 200) {
    const { error: e } = await client.from("journal_entries").upsert(rows.slice(i, i + 200), { onConflict: "date" });
    if (e) return { ok: false, error: e.message };
  }
  refresh();
  return { ok: true, imported: rows.length, skipped };
}
