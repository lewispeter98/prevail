import { timingSafeEqual, createHash } from "node:crypto";
import { adminDb } from "@/lib/db";
import { today } from "@/lib/day";
import { getReflection } from "@/lib/journal";
import { createWeeklyReview } from "@/lib/weeklyReview";
import { weekStart } from "@/lib/weightStats";

export const maxDuration = 300;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(given), hash(`Bearer ${secret}`));
}

/** Runs on Sunday evenings (see vercel.json) and writes this week's review. */
export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorised", { status: 401 });
  const client = adminDb();
  const monday = weekStart(today());
  if (await getReflection(client, "weekly", monday)) {
    return Response.json({ ok: true, skipped: "already written", week: monday });
  }
  await createWeeklyReview(client, monday);
  return Response.json({ ok: true, week: monday });
}
