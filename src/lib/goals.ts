import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayKey } from "./day";

export type LifeGoal = { id: string; text: string };
export type Objective = { month: DayKey; slot: number; text: string; achievedOn: DayKey | null };

export async function getActiveGoals(client: SupabaseClient): Promise<LifeGoal[]> {
  const { data, error } = await client
    .from("life_goals")
    .select("id, text")
    .eq("active", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data as LifeGoal[];
}

/** The goals as written on a given day, or null if that day wasn't scripted. */
export async function getScript(client: SupabaseClient, date: DayKey): Promise<string[] | null> {
  const { data, error } = await client.from("goal_scripts").select("goals").eq("date", date).maybeSingle();
  if (error) throw error;
  return data ? (data.goals as string[]) : null;
}

export async function listScriptDates(client: SupabaseClient): Promise<DayKey[]> {
  const out: DayKey[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from("goal_scripts")
      .select("date")
      .order("date", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    out.push(...data.map((d) => d.date as string));
    if (data.length < 1000) break;
  }
  return out;
}

type ObjectiveRow = { month: string; slot: number; text: string; achieved_on: string | null };
const toObjective = (r: ObjectiveRow): Objective => ({
  month: r.month,
  slot: r.slot,
  text: r.text,
  achievedOn: r.achieved_on,
});

export async function getObjectives(client: SupabaseClient, months?: DayKey[]): Promise<Objective[]> {
  let q = client.from("objectives").select("month, slot, text, achieved_on").order("month").order("slot");
  if (months) q = q.in("month", months);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ObjectiveRow[]).map(toObjective);
}
