import "server-only";
import { db } from "./db";
import type { WeightEntry } from "./weightStats";

export async function getWeights(): Promise<WeightEntry[]> {
  const client = await db();
  const rows: WeightEntry[] = [];
  // Page through in case the history grows past the API's row limit.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from("weight_entries")
      .select("date, weight_kg")
      .order("date", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data.map((r) => ({ date: r.date as string, kg: Number(r.weight_kg) })));
    if (data.length < 1000) break;
  }
  return rows;
}

export async function getGoalWeight(): Promise<number | null> {
  const client = await db();
  const { data, error } = await client.from("settings").select("goal_weight_kg").eq("id", 1).single();
  if (error) throw error;
  return data.goal_weight_kg == null ? null : Number(data.goal_weight_kg);
}
