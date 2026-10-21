"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addDays, formatDay, londonClock, toDate, type DayKey } from "@/lib/day";
import {
  categorise,
  endOf,
  fmtHours,
  NONE,
  timeDayOf,
  timeDayStart,
  type DailyTotals,
  type TimeCategory,
  type TimeEntry,
  type TimeRule,
} from "@/lib/timeCore";
import { loadDayEntries, loadTotals } from "../actions";
import { CategoryPicker } from "../CategoryPicker";
import { EntryRow } from "../EntryRow";
import { AddEntry } from "./AddEntry";

type Period = "day" | "week" | "month" | "year";
const DAY_MS = 86_400_000;

type Props = {
  today: DayKey;
  serverNow: number;
  totalsFrom: DayKey;
  totals: DailyTotals;
  recentFrom: DayKey;
  entries: TimeEntry[];
  categories: TimeCategory[];
  rules: TimeRule[];
};

const monthStart = (d: DayKey) => `${d.slice(0, 7)}-01`;
const addMonths = (d: DayKey, n: number) => {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
};
const weekStart = (d: DayKey) => addDays(d, -((toDate(d).getUTCDay() + 6) % 7));

function range(period: Period, a: DayKey): [DayKey, DayKey] {
  if (period === "day") return [a, a];
  if (period === "week") return [weekStart(a), addDays(weekStart(a), 6)];
  if (period === "month") return [monthStart(a), addDays(addMonths(monthStart(a), 1), -1)];
  return [`${a.slice(0, 4)}-01-01`, `${a.slice(0, 4)}-12-31`];
}

function days(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function BreakdownView(props: Props) {
  const { today, serverNow, categories, rules } = props;
  const [period, setPeriod] = useState<Period>("day");
  const [anchor, setAnchor] = useState<DayKey>(today);
  // Older data fetched on demand. Cleared whenever something is edited, since a
  // new rule can recategorise everything.
  const [olderTotals, setOlderTotals] = useState<DailyTotals>({});
  const [olderFrom, setOlderFrom] = useState(props.totalsFrom);
  const [dayCache, setDayCache] = useState<Record<DayKey, TimeEntry[]>>({});
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<{ id: string; label: string; when: string; current: string | null } | null>(null);
  const [now] = useState(serverNow);
  // Entries added on this screen show at once; they're dropped as soon as fresh
  // data arrives from the server.
  const [added, setAdded] = useState<TimeEntry[]>([]);
  const [seenEntries, setSeenEntries] = useState(props.entries);
  if (seenEntries !== props.entries) {
    setSeenEntries(props.entries);
    setAdded([]);
  }
  const withAdded = (list?: TimeEntry[]) =>
    list && [...list, ...added.filter((a) => !list.some((e) => e.id === a.id))].sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const totals: DailyTotals = { ...olderTotals, ...props.totals };
  const byId = new Map(categories.map((c) => [c.id, c]));
  const [from, to] = range(period, anchor);
  const shown = days(from, to < today ? to : today);

  // Make sure totals for the visible range are loaded.
  useEffect(() => {
    if (from >= olderFrom) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadTotals(from, addDays(olderFrom, -1)).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setOlderTotals((t) => ({ ...res.totals, ...t }));
        setOlderFrom(from);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [from, olderFrom]);

  // Entries for the day view: recent days come with the page, older ones are fetched.
  const recent = anchor >= props.recentFrom;
  useEffect(() => {
    if (period !== "day" || recent || dayCache[anchor]) return;
    let cancelled = false;
    loadDayEntries(anchor).then((res) => {
      if (!cancelled && res.ok) setDayCache((c) => ({ ...c, [anchor]: res.entries }));
    });
    return () => {
      cancelled = true;
    };
  }, [period, anchor, recent, dayCache]);

  const resetOlder = () => {
    setAdded([]);
    setOlderTotals({});
    setOlderFrom(props.totalsFrom);
    setDayCache({});
  };

  function shift(dir: number) {
    let next = anchor;
    if (period === "day") next = addDays(anchor, dir);
    if (period === "week") next = addDays(anchor, 7 * dir);
    if (period === "month") next = addMonths(monthStart(anchor), dir);
    if (period === "year") next = `${Number(anchor.slice(0, 4)) + dir}-01-01`;
    setAnchor(next > today ? today : next);
  }

  // Sum the visible days.
  const sum: Record<string, number> = {};
  let logged = 0;
  let span = 0;
  for (const d of shown) {
    const t = totals[d];
    span += d === today ? Math.max(0, now - timeDayStart(d).getTime()) / 60_000 : 1440;
    if (!t) continue;
    logged++;
    for (const [c, m] of Object.entries(t)) sum[c] = (sum[c] ?? 0) + m;
  }
  const tracked = Object.values(sum).reduce((a, b) => a + b, 0);
  const untracked = Math.max(0, span - tracked);
  const order = Object.entries(sum).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, untracked, ...order.map((o) => o[1]));
  const perDay = period !== "day";
  const n = Math.max(1, shown.length);

  const colourOf = (id: string) => (id === NONE ? "var(--faint)" : (byId.get(id)?.colour ?? "var(--faint)"));
  const nameOf = (id: string) => (id === NONE ? "Uncategorised" : (byId.get(id)?.name ?? "Deleted category"));
  const catOrder = (id: string) => {
    const i = categories.findIndex((c) => c.id === id);
    return i < 0 ? 99 : i;
  };

  const title =
    period === "day"
      ? formatDay(anchor, { weekday: "long", day: "numeric", month: "long" })
      : period === "week"
        ? `${formatDay(from, { day: "numeric", month: "short" })} – ${formatDay(to, { day: "numeric", month: "short" })}`
        : period === "month"
          ? formatDay(from, { month: "long", year: "numeric" })
          : from.slice(0, 4);
  const eyebrow = period === "day" ? (anchor === today ? "Today so far" : "Day") : period[0].toUpperCase() + period.slice(1);

  // Plain render helpers (not components), so React keeps the same elements between renders.
  function column(key: string, t: Record<string, number> | undefined, spanMin: number, label: string, onClick: () => void) {
    const parts = Object.entries(t ?? {}).sort((a, b) => catOrder(a[0]) - catOrder(b[0]));
    return (
      <button
        key={key}
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        className={`flex h-full min-w-0 flex-1 flex-col-reverse overflow-hidden rounded-md ${t ? "" : "opacity-45"}`}
        style={{ background: "repeating-linear-gradient(135deg,var(--pill) 0 4px,transparent 4px 8px)" }}
      >
        {parts.map(([c, m]) => (
          <i key={c} className="block w-full" style={{ height: `${(m / spanMin) * 100}%`, background: colourOf(c) }} />
        ))}
      </button>
    );
  }

  function chart() {
    if (period === "day") {
      const list = withAdded(recent ? props.entries : dayCache[anchor]);
      if (!list) return <div className="mt-3.5 h-[34px] animate-pulse rounded-[10px] bg-pill" />;
      const s = timeDayStart(anchor).getTime();
      const e = Math.min(s + DAY_MS, now);
      return (
        <>
          <div
            className="relative mt-3.5 h-[34px] overflow-hidden rounded-[10px] border border-line"
            role="img"
            aria-label="Midnight to midnight, coloured by category"
            style={{ background: "repeating-linear-gradient(135deg,var(--pill) 0 6px,transparent 6px 12px)" }}
          >
            {list.map((en, i) => {
              const a = Math.max(Date.parse(en.startedAt), s);
              const b = Math.min(endOf(list, i, now), e);
              if (b <= a) return null;
              const c = categorise(en.label, en.override, rules);
              return (
                <span
                  key={en.id}
                  title={`${londonClock(new Date(a)).hm} ${en.label}`}
                  className="absolute inset-y-0"
                  style={{
                    left: `${((a - s) / DAY_MS) * 100}%`,
                    width: `${((b - a) / DAY_MS) * 100}%`,
                    background: colourOf(c ?? NONE),
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10.5px] text-muted tabular-nums">
            {["12am", "4", "8", "12pm", "4", "8", "12am"].map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </div>
        </>
      );
    }
    if (period === "year") {
      const year = from.slice(0, 4);
      const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}-01`);
      return (
        <>
          <div className="mt-4 flex h-[150px] items-end gap-[5px]" role="img" aria-label="Average day per month">
            {months.map((m) => {
              const ds = days(m, addDays(addMonths(m, 1), -1)).filter((d) => d <= today);
              const avg: Record<string, number> = {};
              let any = false;
              for (const d of ds) {
                const t = totals[d];
                if (!t) continue;
                any = true;
                for (const [c, v] of Object.entries(t)) avg[c] = (avg[c] ?? 0) + v / ds.length;
              }
              return (
                column(m, any ? avg : undefined, 1440, `${formatDay(m, { month: "long" })}: average day`, () => {
                if (m <= today) {
                  setPeriod("month");
                  setAnchor(m);
                }
              })
              );
            })}
          </div>
          <div className="mt-1 flex gap-[5px]">
            {months.map((m) => (
              <span key={m} className="flex-1 text-center text-[10.5px] text-muted">
                {formatDay(m, { month: "narrow" })}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">Each bar is an average day that month. Tap one to open it.</p>
        </>
      );
    }
    const all = days(from, to);
    const gap = period === "week" ? 6 : 2;
    return (
      <>
        <div className="mt-4 flex h-[150px] items-end" style={{ gap }} role="img" aria-label="Each day, coloured by category">
          {all.map((d) => (
            column(d, d <= today ? totals[d] : undefined, 1440, formatDay(d, { weekday: "short", day: "numeric", month: "short" }), () => {
              if (d <= today) {
                setPeriod("day");
                setAnchor(d);
              }
            })
          ))}
        </div>
        <div className="mt-1 flex" style={{ gap }}>
          {all.map((d, i) => (
            <span key={d} className="min-w-0 flex-1 text-center text-[10.5px] text-muted tabular-nums">
              {period === "week" ? formatDay(d, { weekday: "narrow" }) : i % 5 === 0 ? Number(d.slice(8)) : ""}
            </span>
          ))}
        </div>
      </>
    );
  }

  const dayList = period === "day" ? withAdded(recent ? props.entries : dayCache[anchor]) : undefined;

  // Activities you've logged recently, most frequent first, as suggestions when adding.
  const suggestions = (() => {
    const counts = new Map<string, number>();
    for (const e of props.entries) {
      const k = e.label.trim().toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k]) => k);
  })();
  const dayRows = dayList?.map((e, i) => ({ e, i })).filter(({ e }) => timeDayOf(new Date(e.startedAt)) === anchor) ?? [];

  return (
    <>
      <section className="card">
        <div className="flex gap-0.5 rounded-full border border-line bg-surface p-[3px]" role="group" aria-label="Period">
          {(["day", "week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-full py-1.5 text-[12.5px] ${period === p ? "bg-ink font-semibold text-bg" : "font-medium text-muted"}`}
            >
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="mt-3.5 flex items-center justify-between">
          <button type="button" aria-label="Previous" onClick={() => shift(-1)} className="size-9 rounded-full border border-line text-muted">
            ‹
          </button>
          <div className="text-center">
            <div className="label">{eyebrow}</div>
            <div className="font-serif text-xl font-semibold">{title}</div>
          </div>
          <button
            type="button"
            aria-label="Next"
            disabled={to >= today}
            onClick={() => shift(1)}
            className="size-9 rounded-full border border-line text-muted disabled:opacity-30"
          >
            ›
          </button>
        </div>
        {chart()}
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-[13px] text-muted">
            {loading ? "Loading…" : `Tracked${perDay ? ` across ${logged} of ${shown.length} days` : ""}`}
          </span>
          <span className="num text-xl font-semibold">{fmtHours(tracked)}</span>
        </div>
      </section>

      <section className="card py-1.5">
        {perDay && order.length > 0 && (
          <div className="grid grid-cols-[1fr_auto_64px] gap-3 pt-3 pb-1">
            <span className="label">Category</span>
            <span className="label text-right">Per day</span>
            <span className="label text-right">Total</span>
          </div>
        )}
        {order.length === 0 && <p className="py-3 text-sm text-muted">Nothing logged in this period.</p>}
        {[...order, ...(untracked > 5 && tracked > 0 ? [["untracked", untracked] as [string, number]] : [])].map(([c, m]) => (
          <div key={c} className="grid grid-cols-[1fr_auto_64px] items-center gap-x-3 gap-y-1 border-b border-line py-2.5 last:border-b-0">
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{
                  background:
                    c === "untracked" ? "repeating-linear-gradient(135deg,var(--faint) 0 3px,transparent 3px 6px)" : colourOf(c),
                }}
              />
              <span className="truncate">{c === "untracked" ? "Untracked" : nameOf(c)}</span>
              {c === NONE && (
                <Link href="/time/settings#sort" className="link text-xs">
                  sort
                </Link>
              )}
            </span>
            <span className="text-right text-xs text-muted tabular-nums">{perDay ? fmtHours(m / n) : ""}</span>
            <span className={`num text-right text-lg font-semibold ${c === "untracked" ? "text-muted" : ""}`}>{fmtHours(m)}</span>
            <span className="col-span-3 h-1 overflow-hidden rounded-full bg-pill">
              <i
                className="block h-full"
                style={{
                  width: `${(m / max) * 100}%`,
                  background:
                    c === "untracked" ? "repeating-linear-gradient(135deg,var(--faint) 0 3px,transparent 3px 6px)" : colourOf(c),
                }}
              />
            </span>
          </div>
        ))}
      </section>

      {period === "day" && (
        <section className="card pt-1.5 pb-2">
          <div className="pt-3">
            <span className="label">Timeline</span>
          </div>
          {!dayList && <p className="py-3 text-sm text-muted">Loading…</p>}
          {dayList && dayRows.length === 0 && <p className="py-3 text-sm text-muted">Nothing logged this day.</p>}
          {dayList &&
            dayRows.map(({ e, i }) => (
              <EntryRow
                key={e.id}
                entry={e}
                current={false}
                durationMs={endOf(dayList, i, now) - Date.parse(e.startedAt)}
                category={byId.get(categorise(e.label, e.override, rules) ?? "") ?? null}
                onCategorise={() =>
                  setPicker({
                    id: e.id,
                    label: e.label,
                    when: `${formatDay(anchor, { weekday: "short", day: "numeric", month: "short" })} · ${londonClock(new Date(e.startedAt)).hm}`,
                    current: categorise(e.label, e.override, rules),
                  })
                }
                onSaved={resetOlder}
              />
            ))}
          {dayList && (
            <AddEntry
              key={anchor}
              day={anchor}
              defaultTime={
                anchor === today
                  ? londonClock(new Date(now)).hm
                  : dayRows.length
                    ? londonClock(new Date(dayRows[dayRows.length - 1].e.startedAt)).hm
                    : "09:00"
              }
              suggestions={suggestions}
              onAdded={(entry) => {
                resetOlder();
                setAdded((a) => [...a, entry]);
                if (!categorise(entry.label, null, rules)) {
                  setPicker({
                    id: entry.id,
                    label: entry.label,
                    when: `${formatDay(anchor, { weekday: "short", day: "numeric", month: "short" })} · ${londonClock(new Date(entry.startedAt)).hm}`,
                    current: null,
                  });
                }
              }}
            />
          )}
        </section>
      )}

      {picker && (
        <CategoryPicker
          entry={picker}
          current={picker.current}
          categories={categories}
          onClose={() => {
            setPicker(null);
            resetOlder();
          }}
        />
      )}
    </>
  );
}
