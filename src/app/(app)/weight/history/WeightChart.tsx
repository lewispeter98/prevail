"use client";

import { useMemo, useRef, useState } from "react";
import { addDays, formatDay, shortDay, toDate, type DayKey } from "@/lib/day";
import { fmtKg, type WeightEntry } from "@/lib/weightStats";

type Point = WeightEntry & { avg: number };
const RANGES = { "1M": 30, "3M": 91, "6M": 182, "1Y": 365, All: Infinity } as const;
type Range = keyof typeof RANGES;

const W = 360;
const H = 210;
const L = 30;
const R = 10;
const T = 10;
const B = 22;

export function WeightChart({ points, goal, today }: { points: Point[]; goal: number | null; today: DayKey }) {
  const [range, setRange] = useState<Range>("3M");
  const [hover, setHover] = useState<Point | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chart = useMemo(() => {
    const days = RANGES[range];
    const cutoff = days === Infinity ? "" : addDays(today, -days);
    const pts = points.filter((p) => p.date >= cutoff);
    if (pts.length === 0) return null;
    const kgs = pts.map((p) => p.kg);
    let lo = Math.floor(Math.min(...kgs) - 0.3);
    let hi = Math.ceil(Math.max(...kgs) + 0.3);
    if (hi - lo < 2) {
      lo -= 1;
      hi += 1;
    }
    const t0 = toDate(pts[0].date).getTime();
    const t1 = Math.max(toDate(pts[pts.length - 1].date).getTime(), t0 + 86_400_000);
    const x = (d: DayKey) => L + ((toDate(d).getTime() - t0) / (t1 - t0)) * (W - L - R);
    const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
    const step = hi - lo > 12 ? 4 : hi - lo > 6 ? 2 : 1;
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    const xLabels = [0, 1, 2, 3].map((k) => new Date(t0 + ((t1 - t0) * k) / 3).toISOString().slice(0, 10))
      .map((d, k, all) => (k > 0 && d === all[k - 1] ? null : d));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.avg).toFixed(1)}`).join("");
    const area = `${line}L${x(pts[pts.length - 1].date).toFixed(1)},${H - B}L${x(pts[0].date).toFixed(1)},${H - B}Z`;
    return { pts, x, y, ticks, xLabels, line, area, lo, hi };
  }, [points, range, today]);

  const shown = hover ?? points[points.length - 1];

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    if (!chart || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    let best = chart.pts[0];
    for (const p of chart.pts) if (Math.abs(chart.x(p.date) - sx) < Math.abs(chart.x(best.date) - sx)) best = p;
    setHover(best);
  }

  return (
    <section className="card px-3.5 pt-[18px] pb-3">
      <div className="flex items-center justify-between gap-2 px-1.5">
        <span className="label">Weight log</span>
        <div className="inline-flex gap-0.5 rounded-full border border-line bg-surface p-[3px]" role="group" aria-label="Range">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <button
              key={r}
              aria-pressed={range === r}
              onClick={() => {
                setRange(r);
                setHover(null);
              }}
              className={`rounded-full px-2.5 py-1.5 text-[12.5px] ${
                range === r ? "bg-ink font-semibold text-bg" : "font-medium text-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1 mb-2.5 flex items-baseline gap-2 px-1.5" aria-live="polite">
        <span className="num text-[34px] leading-none font-semibold">{fmtKg(shown.kg)}</span>
        <span className="text-[13px] text-muted">
          kg · {shortDay(shown.date)} · 7-day avg {fmtKg(shown.avg)}
        </span>
      </div>

      {chart && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-pan-y"
          role="img"
          aria-label={`Weight over ${range === "All" ? "all time" : `the last ${range}`}`}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--camel)" stopOpacity=".18" />
              <stop offset="1" stopColor="var(--camel)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {chart.ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={chart.y(v)} y2={chart.y(v)} stroke="var(--line)" />
              <text x={L - 6} y={chart.y(v) + 3} textAnchor="end" fontSize="9.5" fill="var(--muted)">
                {v}
              </text>
            </g>
          ))}
          {chart.xLabels.map((d, k) => d && (
            <text
              key={k}
              x={L + ((W - L - R) * k) / 3}
              y={H - 6}
              textAnchor={k === 0 ? "start" : k === 3 ? "end" : "middle"}
              fontSize="9.5"
              fill="var(--muted)"
            >
              {formatDay(d, { day: "numeric", month: "short" })}
            </text>
          ))}
          {goal != null && goal >= chart.lo && goal <= chart.hi && (
            <line
              x1={L}
              x2={W - R}
              y1={chart.y(goal)}
              y2={chart.y(goal)}
              stroke="var(--green-ink)"
              strokeDasharray="4 4"
              strokeWidth="1.2"
            />
          )}
          <path d={chart.area} fill="url(#weight-area)" />
          {chart.pts.map((p) => (
            <circle
              key={p.date}
              cx={chart.x(p.date)}
              cy={chart.y(p.kg)}
              r={chart.pts.length > 120 ? 1.3 : 2}
              fill="var(--faint)"
            />
          ))}
          <path d={chart.line} fill="none" stroke="var(--camel)" strokeWidth="2" strokeLinejoin="round" />
          {hover && (
            <g>
              <line
                x1={chart.x(hover.date)}
                x2={chart.x(hover.date)}
                y1={T}
                y2={H - B}
                stroke="var(--muted)"
                strokeDasharray="2 3"
              />
              <circle
                cx={chart.x(hover.date)}
                cy={chart.y(hover.kg)}
                r="4.5"
                fill="var(--surface)"
                stroke="var(--ink)"
                strokeWidth="1.8"
              />
            </g>
          )}
        </svg>
      )}

      <div className="flex gap-4 px-1.5 pt-1.5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5 bg-camel" /> 7-day average
        </span>
        {goal != null && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 border-t-[1.5px] border-dashed border-green-ink" /> Goal
          </span>
        )}
      </div>
    </section>
  );
}
