import { db } from "@/lib/db";
import { formatDay, longDay, today } from "@/lib/day";
import { listEntries, listReflections, type WeeklyReview } from "@/lib/journal";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "md";
  const client = await db(); // checks the session
  const [entries, daily, weekly] = await Promise.all([
    listEntries(client),
    listReflections(client, "daily", 100000),
    listReflections(client, "weekly", 100000),
  ]);
  const dailyByDate = new Map(daily.flatMap((d) => (d.kind === "daily" ? [[d.periodStart, d.content.text]] : [])));
  const stamp = today();

  if (format === "json") {
    const body = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        entries: entries.map((e) => ({ ...e, reflection: dailyByDate.get(e.date) ?? null })),
        weeklyReviews: weekly.map((w) => ({ weekStarting: w.periodStart, ...(w.content as WeeklyReview) })),
      },
      null,
      2,
    );
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="prevail-journal-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const lines: string[] = ["# Prevail journal", ""];
  let month = "";
  for (const e of entries) {
    const m = formatDay(e.date, { month: "long", year: "numeric" });
    if (m !== month) lines.push(`## ${(month = m)}`, "");
    lines.push(`### ${longDay(e.date)}`);
    if (e.feelings.length) lines.push(`*${e.feelings.join(", ")}*`);
    lines.push("", e.body.trim() || "_(no written entry)_", "");
    const r = dailyByDate.get(e.date);
    if (r) lines.push(`> ${r}`, "");
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="prevail-journal-${stamp}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
