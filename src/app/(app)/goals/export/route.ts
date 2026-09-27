import { db } from "@/lib/db";
import { today } from "@/lib/day";

export async function GET() {
  const client = await db(); // checks the session
  const [goals, objectives, scripts] = await Promise.all([
    client.from("life_goals").select("text, active, sort_order, created_at").order("sort_order"),
    client.from("objectives").select("month, slot, text, achieved_on").order("month").order("slot"),
    client.from("goal_scripts").select("date, goals").order("date"),
  ]);
  for (const r of [goals, objectives, scripts]) if (r.error) throw r.error;

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      lifeGoals: goals.data,
      objectives: objectives.data,
      scriptedDays: scripts.data,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="prevail-goals-${today()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
