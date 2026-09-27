"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { today, type DayKey } from "@/lib/day";
import { getActiveGoals, getScript } from "@/lib/goals";
import { openMonths } from "@/lib/months";
import { isWritten } from "@/lib/scriptMatch";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const refresh = () => revalidatePath("/", "layout");

/** Records today's script. The server re-checks every goal was written out. */
export async function submitScript(typed: string[]): Promise<Result> {
  const client = await db();
  const date = today();
  if (await getScript(client, date)) return { ok: true };
  const goals = await getActiveGoals(client);
  if (goals.length === 0) return { ok: false, error: "Add your life goals first." };
  if (typed.length !== goals.length || !goals.every((g, i) => isWritten(typed[i] ?? "", g.text))) {
    return { ok: false, error: "Every goal needs to be written out in full." };
  }
  const { error } = await client.from("goal_scripts").insert({ date, goals: goals.map((g) => g.text) });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/**
 * Replaces the list of life goals. Goals with an id are updated and reordered,
 * new ones are added, and any missing from the list are retired (kept for history).
 */
export async function saveLifeGoals(goals: { id?: string; text: string }[]): Promise<Result> {
  const clean = goals.map((g) => ({ ...g, text: g.text.replace(/\s+/g, " ").trim() })).filter((g) => g.text);
  if (clean.some((g) => g.text.length > 400)) return { ok: false, error: "Keep each goal under 400 characters." };
  const client = await db();
  const existing = await getActiveGoals(client);
  const keep = new Set(clean.flatMap((g) => (g.id ? [g.id] : [])));
  const retire = existing.filter((g) => !keep.has(g.id)).map((g) => g.id);

  if (retire.length) {
    const { error } = await client.from("life_goals").update({ active: false }).in("id", retire);
    if (error) return { ok: false, error: error.message };
  }
  for (const [i, g] of clean.entries()) {
    const { error } = g.id
      ? await client.from("life_goals").update({ text: g.text, sort_order: i }).eq("id", g.id)
      : await client.from("life_goals").insert({ text: g.text, sort_order: i });
    if (error) return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}

function checkMonth(month: DayKey, slot: number): string | null {
  if (!openMonths().includes(month)) return "That month is closed.";
  if (![1, 2, 3].includes(slot)) return "Invalid objective.";
  return null;
}

/** Sets an objective's wording. Clearing the text removes it. */
export async function setObjective(month: DayKey, slot: number, text: string): Promise<Result> {
  const bad = checkMonth(month, slot);
  if (bad) return { ok: false, error: bad };
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length > 300) return { ok: false, error: "Keep it under 300 characters." };
  const client = await db();
  const { error } = clean
    ? await client.from("objectives").upsert({ month, slot, text: clean }, { onConflict: "month,slot" })
    : await client.from("objectives").delete().eq("month", month).eq("slot", slot);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function markObjective(month: DayKey, slot: number, achieved: boolean): Promise<Result> {
  const bad = checkMonth(month, slot);
  if (bad) return { ok: false, error: bad };
  if (achieved && month > today()) return { ok: false, error: "That month hasn't started yet." };
  const client = await db();
  const { data, error } = await client
    .from("objectives")
    .update({ achieved_on: achieved ? today() : null })
    .eq("month", month)
    .eq("slot", slot)
    .select("slot");
  if (error) return { ok: false, error: error.message };
  if (data.length === 0) return { ok: false, error: "Write the objective first." };
  refresh();
  return { ok: true };
}
