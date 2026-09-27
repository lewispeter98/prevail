import { db } from "@/lib/db";
import { addDays, formatDay, shortDay } from "@/lib/day";
import { listReflections, type WeeklyReview } from "@/lib/journal";
import { reviewableWeek } from "@/lib/weeklyReview";
import { GenerateWeekly } from "./GenerateWeekly";

export const metadata = { title: "Reflections" };
export const maxDuration = 300;

const dm = (d: string) => formatDay(d, { day: "numeric", month: "short" });

export default async function Reflections() {
  const client = await db();
  const [weekly, daily] = await Promise.all([listReflections(client, "weekly"), listReflections(client, "daily", 30)]);
  const target = reviewableWeek();
  const hasTarget = weekly.some((w) => w.periodStart === target);
  const [latest, ...older] = weekly;

  return (
    <>
      {!hasTarget && (
        <section className="card">
          <div className="label">Weekly review</div>
          <p className="mt-1.5 text-sm text-muted">
            Your review for the week of {dm(target)} to {dm(addDays(target, 6))} isn&apos;t written yet. It&apos;s
            written automatically on Sunday evenings.
          </p>
          <GenerateWeekly monday={target} label="Write it now" />
        </section>
      )}

      {latest?.kind === "weekly" && (
        <ReviewCard monday={latest.periodStart} review={latest.content} regenerate={latest.periodStart === target} />
      )}

      {daily.length > 0 && (
        <section className="card py-1.5">
          <div className="label pt-3">Daily reflections</div>
          {daily.map(
            (d) =>
              d.kind === "daily" && (
                <div key={d.periodStart} className="border-b border-line py-3.5 last:border-b-0">
                  <div className="text-[13px] font-semibold text-muted">{shortDay(d.periodStart)}</div>
                  <p className="mt-1 font-serif text-lg leading-[1.4] font-medium italic">{d.content.text}</p>
                </div>
              ),
          )}
        </section>
      )}

      {older.length > 0 && (
        <section className="card py-1.5">
          <div className="label pt-3">Earlier reviews</div>
          {older.map(
            (w) =>
              w.kind === "weekly" && (
                <details key={w.periodStart} className="group border-b border-line py-3 last:border-b-0">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3">
                    <span className="font-serif text-lg font-semibold">{w.content.headline}</span>
                    <span className="shrink-0 text-xs text-muted">w/c {dm(w.periodStart)}</span>
                  </summary>
                  <ReviewBody review={w.content} />
                </details>
              ),
          )}
        </section>
      )}

      {weekly.length === 0 && daily.length === 0 && (
        <p className="text-center text-sm text-muted">
          Reflections appear here once you tap “Done for today” on an entry.
        </p>
      )}
    </>
  );
}

function ReviewCard({ monday, review, regenerate }: { monday: string; review: WeeklyReview; regenerate: boolean }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <span className="label">Weekly review</span>
        <span className="text-[13px] text-muted">w/c {dm(monday)}</span>
      </div>
      <h2 className="mt-1.5 font-serif text-[26px] leading-[1.15] font-semibold text-balance">{review.headline}</h2>
      <ReviewBody review={review} />
      {regenerate && <GenerateWeekly monday={monday} label="Rewrite this review" subtle />}
    </section>
  );
}

function ReviewBody({ review }: { review: WeeklyReview }) {
  const parts: [string, string][] = [
    ["Progress", review.progress],
    ["Where you drifted", review.drift],
    ["Focus for next week", review.focus],
    ["Affirmation", review.affirmation],
  ];
  return (
    <div>
      {parts.map(([title, text]) => (
        <div key={title}>
          <h3 className="mt-4 mb-1 text-xs font-semibold tracking-[0.14em] text-camel uppercase">{title}</h3>
          <p className="text-[14.5px] leading-[1.6]">{text}</p>
        </div>
      ))}
    </div>
  );
}
