import Link from "next/link";
import { addDays, formatDay, shortDay, today } from "@/lib/day";
import { getGoalWeight, getWeights } from "@/lib/weight";
import {
  fmtDelta,
  fmtKg,
  onOrBefore,
  projectGoalDate,
  slopePerDay,
  trendOf,
  type WeightEntry,
} from "@/lib/weightStats";
import { TodayLog } from "./TodayLog";

const TREND_CLASS = { down: "text-green-ink", up: "text-camel", flat: "" };

export default async function WeightToday() {
  const [entries, goal] = await Promise.all([getWeights(), getGoalWeight()]);
  const day = today();
  const todayEntry = entries.find((e) => e.date === day) ?? null;
  const previous = [...entries].reverse().find((e) => e.date < day) ?? null;
  const current = todayEntry ?? previous;

  const compare = (n: number) => {
    if (!current) return null;
    const base = onOrBefore(entries, addDays(current.date, -n));
    return base ? current.kg - base.kg : null;
  };

  return (
    <>
      <TodayLog
        key={todayEntry?.kg ?? "none"}
        todayKg={todayEntry?.kg ?? null}
        last={previous ? { kg: previous.kg, label: shortDay(previous.date) } : null}
      />

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["vs yesterday", 1],
            ["vs 7 days", 7],
            ["vs 30 days", 30],
          ] as const
        ).map(([label, n]) => {
          const d = compare(n);
          return (
            <div key={n} className="rounded-2xl border border-line bg-surface px-2 py-3.5 text-center">
              <div className="text-xs text-muted">{label}</div>
              <div className={`num text-[25px] leading-[1.2] font-semibold ${d == null ? "" : TREND_CLASS[trendOf(d)]}`}>
                {d == null ? "—" : fmtDelta(d)}
                {d != null && <small className="ml-0.5 text-sm font-medium text-muted">kg</small>}
              </div>
            </div>
          );
        })}
      </div>

      <GoalCard entries={entries} current={current} goal={goal} />
    </>
  );
}

function GoalCard({
  entries,
  current,
  goal,
}: {
  entries: WeightEntry[];
  current: WeightEntry | null;
  goal: number | null;
}) {
  if (goal == null) {
    return (
      <Link href="/weight/settings" className="card block font-semibold text-green-ink">
        + Set a goal weight
      </Link>
    );
  }
  const start = entries[0];
  const span = start ? goal - start.kg : 0;
  const pct = current && span !== 0 ? Math.max(0, Math.min(100, ((current.kg - start.kg) / span) * 100)) : 0;
  const togo = current ? Math.abs(current.kg - goal) : null;
  const eta = current ? projectGoalDate(current, goal, slopePerDay(entries, current.date)) : null;

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <span className="label">Goal weight</span>
        <span className="num text-xl font-semibold">{fmtKg(goal)} kg</span>
      </div>
      <div className="mt-3 mb-2.5 h-1.5 overflow-hidden rounded-full bg-pill">
        <div
          className="h-full rounded-full bg-gradient-to-r from-camel to-green-ink"
          style={{ width: `${pct.toFixed(0)}%` }}
        />
      </div>
      <div className="flex justify-between gap-3 text-[13px] text-muted">
        <span>
          {togo == null
            ? "Log a weight to start tracking"
            : togo < 0.05
              ? "Goal reached"
              : `${fmtKg(togo)} kg to go · ${pct.toFixed(0)}% there`}
        </span>
        {eta && <span>On pace for {formatDay(eta, { day: "numeric", month: "short" })}</span>}
      </div>
    </section>
  );
}
