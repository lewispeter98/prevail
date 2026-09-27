"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { today, type DayKey } from "@/lib/day";
import { parseKg } from "@/lib/weightStats";

export type ActionResult = { ok: true } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  // The streak strip lives in the layout, so refresh everything.
  revalidatePath("/", "layout");
}

/** Saves (or replaces) today's weight. */
export async function saveTodayWeight(input: string): Promise<ActionResult> {
  const kg = parseKg(input);
  if (kg == null) return { ok: false, error: "Enter a weight between 20 and 300 kg." };
  const client = await db();
  const { error } = await client
    .from("weight_entries")
    .upsert({ date: today(), weight_kg: kg, source: "app" }, { onConflict: "date" });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function updateWeight(date: DayKey, input: string): Promise<ActionResult> {
  const kg = parseKg(input);
  if (kg == null || !DATE_RE.test(date)) return { ok: false, error: "Enter a weight between 20 and 300 kg." };
  const client = await db();
  const { error } = await client.from("weight_entries").update({ weight_kg: kg }).eq("date", date);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteWeight(date: DayKey): Promise<ActionResult> {
  if (!DATE_RE.test(date)) return { ok: false, error: "Invalid date." };
  const client = await db();
  const { error } = await client.from("weight_entries").delete().eq("date", date);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setGoalWeight(input: string): Promise<ActionResult> {
  const trimmed = input.trim();
  const kg = trimmed === "" ? null : parseKg(trimmed);
  if (trimmed !== "" && kg == null) return { ok: false, error: "Enter a goal between 20 and 300 kg." };
  const client = await db();
  const { error } = await client.from("settings").update({ goal_weight_kg: kg }).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export type ImportRow = { date: DayKey; kg: number };

/** Imports parsed rows. Existing days are skipped unless `overwrite` is set. */
export async function importWeights(
  rows: ImportRow[],
  overwrite: boolean,
): Promise<{ ok: true; imported: number; skipped: number } | { ok: false; error: string }> {
  // One row per day (the last one wins).
  const byDate = new Map<DayKey, ImportRow>();
  for (const r of rows) {
    const kg = parseKg(String(r.kg));
    if (DATE_RE.test(r.date) && kg != null && r.date <= today()) byDate.set(r.date, { date: r.date, kg });
  }
  const clean = [...byDate.values()];
  if (clean.length === 0) return { ok: false, error: "No valid rows to import." };
  if (clean.length > 20000) return { ok: false, error: "That file is too large to import in one go." };

  const client = await db();
  let toWrite = clean;
  if (!overwrite) {
    const { data, error } = await client.from("weight_entries").select("date");
    if (error) return { ok: false, error: error.message };
    const existing = new Set(data.map((d) => d.date as string));
    toWrite = clean.filter((r) => !existing.has(r.date));
  }
  for (let i = 0; i < toWrite.length; i += 500) {
    const chunk = toWrite.slice(i, i + 500).map((r) => ({ date: r.date, weight_kg: r.kg, source: "import" }));
    const { error } = await client.from("weight_entries").upsert(chunk, { onConflict: "date" });
    if (error) return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, imported: toWrite.length, skipped: clean.length - toWrite.length };
}
