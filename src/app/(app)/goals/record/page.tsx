import Link from "next/link";
import { db } from "@/lib/db";
import { addDays, today } from "@/lib/day";
import { getObjectives, listScriptDates, type Objective } from "@/lib/goals";
import { addMonths, isClosed, monthName, monthOf } from "@/lib/months";
import { streakFrom } from "@/lib/streaks";

export const metadata = { title: "Record" };

type MonthRow = { month: string; items: Objective[]; achieved: number; closed: boolean };

export default async function Record() {
  const client = await db();
  const day = today();
  const [objectives, scriptDates] = await Promise.all([getObjectives(client), listScriptDates(client)]);

  // Every month from the first one with objectives up to this month.
  const months: MonthRow[] = [];
  if (objectives.length) {
    const last = monthOf(day);
    for (let m = objectives[0].month; m <= last; m = addMonths(m, 1)) {
      const items = objectives.filter((o) => o.month === m);
      months.push({ month: m, items, achieved: items.filter((o) => o.achievedOn).length, closed: isClosed(m, day) });
    }
  }
  const closed = months.filter((m) => m.closed);
  const set = closed.reduce((a, m) => a + m.items.length, 0);
  const achieved = closed.reduce((a, m) => a + m.achieved, 0);
  const rate = set ? Math.round((achieved / set) * 100) : null;

  let bestRun = 0;
  let run = 0;
  for (const m of closed) {
    run = m.items.length === 3 && m.achieved === 3 ? run + 1 : 0;
    bestRun = Math.max(bestRun, run);
  }
  const perfect = closed.filter((m) => m.items.length === 3 && m.achieved === 3).length;

  const scripted = new Set(scriptDates);
  const since30 = addDays(day, -29);
  const last30 = scriptDates.filter((d) => d >= since30).length;
  const scriptStreak = streakFrom(scripted, day);
  const bestScriptRun = scriptStreak.best;

  return (
    <>
      <section className="card">
        <div className="label">Objectives achieved</div>
        {set === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Your score starts once your first month closes.{" "}
            {objectives.length === 0 && (
              <Link href="/goals/objectives" className="link text-sm">
                Set this month&apos;s objectives
              </Link>
            )}
          </p>
        ) : (
          <>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <span className="num text-[56px] leading-[.95] font-semibold">{achieved}</span>
                <span className="num text-[28px] text-muted"> / {set}</span>
              </div>
              <div className="text-right">
                <span className="num text-[40px] font-semibold text-green-ink">{rate}%</span>
                <div className="text-[13px] text-muted">since {monthName(closed[0].month, true)}</div>
              </div>
            </div>
            <hr className="my-4 border-line" />
            <Stat label="Months at 3/3" value={`${perfect}`} />
            <Stat label="Best run at 3/3" value={`${bestRun} month${bestRun === 1 ? "" : "s"}`} />
          </>
        )}
      </section>

      <section className="card">
        <div className="label">Goal scripting</div>
        <div className="mt-2">
          <Stat label="Current streak" value={`${scriptStreak.count} day${scriptStreak.count === 1 ? "" : "s"}`} />
          <Stat label="Best streak" value={`${bestScriptRun} day${bestScriptRun === 1 ? "" : "s"}`} />
          <Stat label="Last 30 days" value={`${last30} of 30`} />
          <Stat label="All time" value={`${scriptDates.length} day${scriptDates.length === 1 ? "" : "s"}`} />
        </div>
      </section>

      {months.length > 0 && (
        <section className="card py-2">
          {[...months].reverse().map((m) => (
            <div
              key={m.month}
              className="grid grid-cols-[1fr_auto_44px] items-center gap-3 border-b border-line py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="font-semibold">
                  {monthName(m.month, m.month.slice(0, 4) !== day.slice(0, 4))}
                  {!m.closed && <span className="ml-2 text-xs font-normal text-camel">In progress</span>}
                </div>
                <div className="text-xs text-muted">
                  {m.items.length === 0
                    ? "No objectives set"
                    : m.items.map((o, i) => (
                        <span key={o.slot} className={o.achievedOn ? "text-green-ink" : ""}>
                          {i > 0 && " · "}
                          {o.text}
                        </span>
                      ))}
                </div>
              </div>
              <span className="flex gap-[5px]">
                {[0, 1, 2].map((i) => (
                  <i
                    key={i}
                    className={`size-2.5 rounded-full border-[1.5px] ${
                      i < m.achieved ? "border-green-ink bg-green-ink" : "border-faint"
                    }`}
                  />
                ))}
              </span>
              <span className={`num text-right text-lg font-semibold ${m.closed ? "" : "text-muted"}`}>
                {m.achieved}/{m.items.length || 3}
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-[13.5px] text-muted">
      <span>{label}</span>
      <b className="font-semibold text-ink">{value}</b>
    </div>
  );
}
