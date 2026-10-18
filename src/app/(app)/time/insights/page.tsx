import { db } from "@/lib/db";
import { addDays, dayOf, formatDay, londonClock, requestTime, toDate, today } from "@/lib/day";
import { getCategories, getDailyTotals, getEntriesForDays, getRules } from "@/lib/time";
import { categorise, endOf, fmtHours, NONE } from "@/lib/timeCore";

export const metadata = { title: "Time insights" };

const sumDays = (totals: Record<string, Record<string, number>>, from: string, to: string) => {
  const out: Record<string, number> = {};
  let logged = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const t = totals[d];
    if (!t) continue;
    logged++;
    for (const [c, m] of Object.entries(t)) out[c] = (out[c] ?? 0) + m;
  }
  return { by: out, logged };
};

/** "07:42" from minutes after midnight (values past 24h wrap). */
const clock = (mins: number) => {
  const m = Math.round(mins) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export default async function TimeInsights() {
  const client = await db();
  const end = today();
  const monday = addDays(end, -((toDate(end).getUTCDay() + 6) % 7));
  const elapsed = Math.round((toDate(end).getTime() - toDate(monday).getTime()) / 86_400_000);
  const lastMonday = addDays(monday, -7);
  const [totals, categories, rules, entries] = await Promise.all([
    getDailyTotals(client, lastMonday, end),
    getCategories(client),
    getRules(client),
    getEntriesForDays(client, addDays(end, -13), end),
  ]);

  const thisWeek = sumDays(totals, monday, end);
  const lastWeek = sumDays(totals, lastMonday, addDays(lastMonday, elapsed));
  const byId = new Map(categories.map((c) => [c.id, c]));
  const find = (name: string) => categories.find((c) => c.name.toLowerCase() === name)?.id;
  const workId = find("work");
  const sleepId = find("sleep");
  const breakId = categories.find((c) => c.name.toLowerCase().startsWith("break"))?.id;

  if (thisWeek.logged === 0 && lastWeek.logged === 0) {
    return (
      <section className="card">
        <div className="label">Insights</div>
        <p className="mt-2 text-sm text-muted">
          Insights appear after a few days of logging. Start on the Now tab, or import your notes from settings.
        </p>
      </section>
    );
  }

  const tracked = Object.values(thisWeek.by).reduce((a, b) => a + b, 0);
  const span = (elapsed + 1) * 1440;
  const rows = [...new Set([...Object.keys(thisWeek.by), ...Object.keys(lastWeek.by)])]
    .map((id) => ({ id, a: thisWeek.by[id] ?? 0, b: lastWeek.by[id] ?? 0 }))
    .sort((x, y) => y.a - x.a);

  // Patterns from the last 14 days of entries.
  const now = requestTime();
  const segs = entries.map((e, i) => ({
    day: dayOf(new Date(e.startedAt)),
    start: Date.parse(e.startedAt),
    end: endOf(entries, i, now),
    cat: categorise(e.label, e.override, rules),
  }));
  const mins = (t: number) => {
    const { hm } = londonClock(new Date(t));
    const [h, m] = hm.split(":").map(Number);
    return (h < 4 ? h + 24 : h) * 60 + m; // after midnight counts as late, not early
  };
  const workDays = new Map<string, { first: number; last: number }>();
  let longest: { len: number; start: number; end: number } | null = null;
  let breaks = 0;
  for (const s of segs) {
    if (s.cat === breakId) breaks++;
    if (!workId || s.cat !== workId) continue;
    const w = workDays.get(s.day) ?? { first: Infinity, last: -Infinity };
    w.first = Math.min(w.first, mins(s.start));
    w.last = Math.max(w.last, mins(s.end));
    workDays.set(s.day, w);
    if (!longest || s.end - s.start > longest.len) longest = { len: s.end - s.start, start: s.start, end: s.end };
  }
  const wd = [...workDays.values()];
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const sleepNights = Object.entries(totals).filter(([d, t]) => d >= addDays(end, -13) && d < end && sleepId && t[sleepId]);
  const avgSleep = sleepNights.length ? avg(sleepNights.map(([, t]) => t[sleepId!])) : null;

  const delta = (a: number, b: number) => {
    const d = Math.round(a - b);
    return `${d >= 0 ? "+" : "−"}${fmtHours(Math.abs(d))}`;
  };

  return (
    <>
      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <span className="label">This week so far</span>
          <span className="text-[13px] text-muted">
            {formatDay(monday, { day: "numeric", month: "short" })} – {formatDay(end, { day: "numeric", month: "short" })}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="text-[13px] text-muted">Tracked</div>
            <div className="num text-[26px] leading-tight font-semibold">{fmtHours(tracked)}</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="text-[13px] text-muted">Untracked</div>
            <div className="num text-[26px] leading-tight font-semibold">{Math.max(0, Math.round((1 - tracked / span) * 100))}%</div>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-muted">Compared with the same {elapsed + 1} days last week.</p>
        <div className="mt-1">
          {rows.map(({ id, a, b }) => (
            <div key={id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-line py-2.5 last:border-b-0">
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: byId.get(id)?.colour ?? "var(--faint)" }} />
                <span className="truncate">{id === NONE ? "Uncategorised" : (byId.get(id)?.name ?? "Deleted category")}</span>
              </span>
              <span className={`text-xs font-semibold tabular-nums ${a >= b ? "text-camel" : "text-green-ink"}`}>{delta(a, b)}</span>
              <span className="num w-16 text-right text-lg font-semibold">{fmtHours(a)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="label">Patterns · last 14 days</div>
        {[
          ["Workday usually starts", wd.length ? clock(avg(wd.map((w) => w.first))) : "—"],
          ["Last work usually ends", wd.length ? clock(avg(wd.map((w) => w.last))) : "—"],
          [
            "Longest focus block",
            longest
              ? `${fmtHours(longest.len / 60_000)} · ${formatDay(dayOf(new Date(longest.start)), { weekday: "short" })} ${londonClock(new Date(longest.start)).hm}–${londonClock(new Date(longest.end)).hm}`
              : "—",
          ],
          ["Breaks per working day", wd.length ? (breaks / wd.length).toFixed(1) : "—"],
          ["Average sleep", avgSleep != null ? fmtHours(avgSleep) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
            <span className="text-muted">{k}</span>
            <b className="text-right font-semibold">{v}</b>
          </div>
        ))}
        <p className="mt-3 text-[13px] text-muted">
          Work and sleep patterns use the categories named “Work” and “Sleep”. Your weekly review in the Journal also
          looks at your time.
        </p>
      </section>
    </>
  );
}
