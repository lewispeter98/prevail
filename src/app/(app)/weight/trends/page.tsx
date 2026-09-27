import { formatDay, today } from "@/lib/day";
import { getGoalWeight, getWeights } from "@/lib/weight";
import { fmtDelta, fmtKg, groupByPeriod, projectGoalDate, slopePerDay, trendOf } from "@/lib/weightStats";
import { TrendTable, type Row } from "./TrendTable";

export const metadata = { title: "Trends" };

const TREND_CLASS = { down: "text-green-ink", up: "text-camel", flat: "" };
const dm = (d: string) => formatDay(d, { day: "numeric", month: "short" });

export default async function WeightTrends() {
  const [entries, goal] = await Promise.all([getWeights(), getGoalWeight()]);
  if (entries.length < 2) {
    return (
      <section className="card">
        <div className="label">Trends</div>
        <p className="mt-2 text-sm text-muted">Trends appear once you&apos;ve logged a couple of days.</p>
      </section>
    );
  }

  const first = entries[0];
  const last = entries[entries.length - 1];
  const slope = slopePerDay(entries, today());
  const eta = goal != null ? projectGoalDate(last, goal, slope) : null;
  const total = last.kg - first.kg;

  const toRows = (period: "daily" | "weekly" | "monthly", limit: number, label: (k: string) => string): Row[] =>
    groupByPeriod(entries, period)
      .slice(0, limit)
      .map((r) => ({ key: r.key, label: label(r.key), avg: r.avg, delta: r.delta }));

  const rows = {
    daily: toRows("daily", 14, (k) => formatDay(k, { weekday: "short", day: "numeric", month: "short" })),
    weekly: toRows("weekly", 12, (k) => `w/c ${dm(k)}`),
    monthly: toRows("monthly", 12, (k) => formatDay(k, { month: "long", year: "numeric" })),
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={`Since ${dm(first.date)}`} value={fmtDelta(total)} unit="kg" tone={TREND_CLASS[trendOf(total)]} />
        <Stat
          label="Per week"
          value={slope == null ? "—" : fmtDelta(slope * 7)}
          unit={slope == null ? "" : "kg"}
          tone={slope == null ? "" : TREND_CLASS[trendOf(slope)]}
        />
        <Stat label={goal != null ? `${fmtKg(goal)} kg by` : "Goal"} value={eta ? dm(eta) : "—"} />
      </div>
      <TrendTable rows={rows} />
    </>
  );
}

function Stat({ label, value, unit, tone = "" }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3.5">
      <div className="text-xs text-muted">{label}</div>
      <div className={`num text-[25px] leading-[1.2] font-semibold ${tone}`}>
        {value}
        {unit && <small className="ml-0.5 text-sm font-medium text-muted">{unit}</small>}
      </div>
    </div>
  );
}
