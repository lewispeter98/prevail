"use client";

import { useState } from "react";
import { fmtDelta, fmtKg, trendOf, type Period } from "@/lib/weightStats";

export type Row = { key: string; label: string; avg: number; delta: number | null };

const TITLES: Record<Period, string> = {
  daily: "Last 14 days",
  weekly: "Weekly averages",
  monthly: "Monthly averages",
};
const SHORT: Record<Period, string> = { daily: "Daily", weekly: "Week", monthly: "Month" };

export function TrendTable({ rows }: { rows: Record<Period, Row[]> }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const list = rows[period];
  const maxDelta = Math.max(0.1, ...list.map((r) => Math.abs(r.delta ?? 0)));

  return (
    <section className="card">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="label">{TITLES[period]}</span>
        <div className="inline-flex gap-0.5 rounded-full border border-line bg-surface p-[3px]" role="group" aria-label="Period">
          {(Object.keys(SHORT) as Period[]).map((p) => (
            <button
              key={p}
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] ${
                period === p ? "bg-ink font-semibold text-bg" : "font-medium text-muted"
              }`}
            >
              {SHORT[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        {list.map((r) => {
          const t = r.delta == null ? "flat" : trendOf(r.delta);
          return (
            <div
              key={r.key}
              className="grid grid-cols-[1fr_auto_64px] items-center gap-2.5 border-b border-line py-[11px] text-sm last:border-b-0"
            >
              <span>{r.label}</span>
              <span className="num text-[19px] font-semibold">{fmtKg(r.avg)}</span>
              <div>
                <div
                  className={`text-right text-[12.5px] font-semibold tabular-nums ${
                    t === "down" ? "text-green-ink" : t === "up" ? "text-camel" : "text-muted"
                  }`}
                >
                  {r.delta == null ? "" : fmtDelta(r.delta)}
                </div>
                {r.delta != null && (
                  <div
                    className={`mt-1 ml-auto h-1 rounded-full ${t === "up" ? "bg-camel" : "bg-green-ink"}`}
                    style={{ width: `${Math.max(4, (Math.abs(r.delta) / maxDelta) * 60).toFixed(0)}px` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
