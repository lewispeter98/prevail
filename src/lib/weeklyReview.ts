import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MODEL, writeWeeklyReview } from "./ai";
import { addDays, formatDay, longDay, today, type DayKey } from "./day";
import { getLifeGoals, getReflection, listEntries, saveReflection, type WeeklyReview } from "./journal";
import { weekStart } from "./weightStats";

/** The week the Reflections tab should offer: this week on a Sunday, otherwise last week. */
export function reviewableWeek(day: DayKey = today()): DayKey {
  const monday = weekStart(day);
  return day === addDays(monday, 6) ? monday : addDays(monday, -7);
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Everything Claude needs to know about one Monday–Sunday week, as plain text. */
export async function buildWeekContext(client: SupabaseClient, monday: DayKey): Promise<string> {
  const sunday = addDays(monday, 6);
  const months = [...new Set([`${monday.slice(0, 7)}-01`, `${sunday.slice(0, 7)}-01`])];

  const [entries, weights, scripts, objectives, lifeGoals, lastReview] = await Promise.all([
    listEntries(client, { from: monday, to: sunday }),
    client.from("weight_entries").select("date, weight_kg").gte("date", addDays(monday, -7)).lte("date", sunday),
    client.from("goal_scripts").select("date").gte("date", monday).lte("date", sunday),
    client.from("objectives").select("month, slot, text, achieved_on").in("month", months).order("month").order("slot"),
    getLifeGoals(client),
    getReflection(client, "weekly", addDays(monday, -7)),
  ]);
  for (const r of [weights, scripts, objectives]) if (r.error) throw r.error;

  const w = (weights.data ?? []).map((r) => ({ date: r.date as string, kg: Number(r.weight_kg) }));
  const thisWeek = w.filter((r) => r.date >= monday);
  const lastWeek = w.filter((r) => r.date < monday);
  const thisAvg = avg(thisWeek.map((r) => r.kg));
  const lastAvg = avg(lastWeek.map((r) => r.kg));

  const out: string[] = [`Week: ${longDay(monday)} to ${longDay(sunday)}`, ""];

  out.push("LIFE GOALS (written out daily)");
  out.push(...(lifeGoals.length ? lifeGoals.map((g) => `- ${g}`) : ["(none set yet)"]));
  out.push(`Goals written out on ${scripts.data?.length ?? 0} of 7 days.`, "");

  out.push("MONTHLY OBJECTIVES");
  if (objectives.data?.length) {
    for (const o of objectives.data) {
      const month = formatDay(o.month as string, { month: "long" });
      const status = o.achieved_on ? `achieved ${longDay(o.achieved_on as string)}` : "not yet achieved";
      out.push(`- ${month}: ${o.text} (${status})`);
    }
  } else out.push("(none set)");
  out.push("");

  out.push("WEIGHT");
  if (thisWeek.length) {
    out.push(...thisWeek.map((r) => `- ${longDay(r.date)}: ${r.kg.toFixed(1)} kg`));
    out.push(`Weighed in on ${thisWeek.length} of 7 days. Average ${thisAvg!.toFixed(1)} kg.`);
    if (lastAvg != null) out.push(`Previous week's average: ${lastAvg.toFixed(1)} kg (change ${(thisAvg! - lastAvg).toFixed(1)} kg).`);
  } else out.push("No weigh-ins this week.");
  out.push("");

  out.push("JOURNAL");
  if (entries.length) {
    for (const e of [...entries].reverse()) {
      out.push(`## ${longDay(e.date)}`);
      out.push(`Feelings: ${e.feelings.length ? e.feelings.join(", ") : "none picked"}`);
      out.push(e.body.trim() || "(no written entry)", "");
    }
  } else out.push("No journal entries this week.", "");

  if (lastReview?.kind === "weekly") {
    out.push("LAST WEEK'S REVIEW SAID TO FOCUS ON");
    out.push(lastReview.content.focus);
  }
  return out.join("\n");
}

export async function createWeeklyReview(client: SupabaseClient, monday: DayKey): Promise<WeeklyReview> {
  const context = await buildWeekContext(client, monday);
  const review = await writeWeeklyReview(context);
  await saveReflection(client, "weekly", monday, review, MODEL);
  return review;
}
