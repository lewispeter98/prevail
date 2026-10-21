"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { londonClock, londonInstant, type DayKey } from "@/lib/day";
import { categorise, endOf, fmtDuration, timeDayOf, type TimeCategory, type TimeEntry, type TimeRule } from "@/lib/timeCore";
import { logActivity } from "./actions";
import { CategoryPicker } from "./CategoryPicker";
import { CategoryChip, EntryRow } from "./EntryRow";

type Props = {
  day: DayKey;
  serverNow: number;
  entries: TimeEntry[];
  categories: TimeCategory[];
  rules: TimeRule[];
  quick: string[];
};

/**
 * Ticks every `ms` so durations stay current. Starts from the server's clock to
 * avoid a hydration mismatch. Also returns a way to sync the clock immediately.
 */
function useNow(serverNow: number, ms: number): [number, (t: number) => void] {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return [now, setNow];
}

function Timer({ since, serverNow }: { since: number; serverNow: number }) {
  const [now] = useNow(serverNow, 1000);
  return <>{fmtDuration(now - since)}</>;
}

export function NowView({ day, serverNow, entries, categories, rules, quick }: Props) {
  const router = useRouter();
  const [now, setNow] = useNow(serverNow, 15_000);
  // Entries saved on this screen, shown straight away without waiting for the
  // server to re-render. Dropped as soon as fresh data arrives from the server.
  const [added, setAdded] = useState<TimeEntry[]>([]);
  const [seen, setSeen] = useState(entries);
  if (seen !== entries) {
    setSeen(entries);
    setAdded([]);
  }
  const merged = [...entries, ...added.filter((a) => !entries.some((e) => e.id === a.id))].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  const [optimistic, addOptimistic] = useOptimistic(merged, (state, e: TimeEntry) =>
    [...state, e].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
  );
  /** Fetch this screen's data again after any change. */
  const reload = () => router.refresh();
  const [text, setText] = useState("");
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ id: string; label: string; when: string; current: string | null } | null>(null);
  const [, startTransition] = useTransition();

  const byId = new Map(categories.map((c) => [c.id, c]));
  const catOf = (e: TimeEntry) => byId.get(categorise(e.label, e.override, rules) ?? "") ?? null;

  let ci = -1;
  optimistic.forEach((e, i) => {
    // The latest entry is "right now". Allow a little slack so the server's
    // timestamp, or a phone clock a few seconds behind, never hides it.
    if (Date.parse(e.startedAt) <= now + 120_000) ci = i;
  });
  const cur = ci >= 0 ? optimistic[ci] : null;
  const curCat = cur ? catOf(cur) : null;
  const onBreak = curCat?.name.toLowerCase().startsWith("break");
  const backTo = onBreak ? [...optimistic.slice(0, ci)].reverse().find((e) => !catOf(e)?.name.toLowerCase().startsWith("break")) : null;
  const todays = optimistic.map((e, i) => ({ e, i })).filter(({ e }) => timeDayOf(new Date(e.startedAt)) === day).reverse();

  function log(label: string) {
    const clean = label.trim();
    if (!clean) return;
    setError(null);
    // Show the switch straight away, including when logging late with a start time.
    let at = new Date();
    // Sync the clock first, so the new entry counts as "right now" (and its
    // quick button lights up) immediately rather than at the next tick.
    setNow(at.getTime());
    if (time) {
      const t = londonInstant(londonClock(at).date, time);
      at = t > at ? new Date(t.getTime() - 86_400_000) : t;
    }
    startTransition(async () => {
      addOptimistic({ id: `pending-${at.getTime()}`, startedAt: at.toISOString(), label: clean, override: null });
      const res = await logActivity(clean, time);
      if (!res.ok) return setError(res.error);
      setAdded((a) => [...a, res.entry]);
      setText("");
      setTime(null);
      reload();
      // The screen already has the rules, so no extra round trip to check the category.
      if (!categorise(clean, null, rules)) {
        setPicker({ id: res.entry.id, label: clean, when: `Started ${time ?? londonClock(new Date()).hm}`, current: null });
      }
    });
  }

  const openPicker = (e: TimeEntry) => {
    const c = londonClock(new Date(e.startedAt));
    setPicker({ id: e.id, label: e.label, when: `Started ${c.hm}`, current: catOf(e)?.id ?? null });
  };

  return (
    <>
      {/* Fixed height so the quick buttons below never move. */}
      <section className="card flex h-[148px] flex-col justify-between px-5 py-4" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <span className="label">Right now</span>
          {backTo && (
            <button
              type="button"
              onClick={() => log(backTo.label)}
              className="max-w-[60%] truncate rounded-full border border-line px-2.5 py-[3px] text-[12.5px] font-semibold text-green-ink"
            >
              ↩ Back to {backTo.label}
            </button>
          )}
        </div>
        <div className="truncate font-serif text-[40px] leading-[1.1] font-medium" title={cur?.label}>
          {cur?.label ?? "Nothing logged yet"}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>
            {cur && (
              <>
                <span className="num text-[26px] leading-none font-semibold text-green-ink">
                  <Timer since={Date.parse(cur.startedAt)} serverNow={serverNow} />
                </span>{" "}
                <span className="text-[13px] text-muted">since {londonClock(new Date(cur.startedAt)).hm}</span>
              </>
            )}
          </span>
          {cur && !cur.id.startsWith("pending") && <CategoryChip category={curCat} onClick={() => openPicker(cur)} />}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Quick switch">
        {quick.map((q) => {
          const active = cur?.label.trim().toLowerCase() === q;
          const c = byId.get(categorise(q, null, rules) ?? "");
          return (
            <button
              key={q}
              type="button"
              onClick={() => log(q)}
              aria-current={active}
              className={`flex h-[50px] min-w-0 items-center gap-2.5 rounded-[14px] border px-3 text-left text-[14.5px] font-medium ${
                active ? "border-ink bg-ink text-bg" : "border-line bg-surface"
              }`}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: c?.colour ?? "var(--faint)" }} />
              <span className="truncate">{q}</span>
            </button>
          );
        })}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          log(text);
        }}
      >
        <label htmlFor="time-what" className="sr-only">
          Something else
        </label>
        <input
          id="time-what"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Something else…"
          autoComplete="off"
          enterKeyHint="go"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-3 text-base"
        />
        <button type="submit" className="btn w-auto px-5" disabled={!text.trim()}>
          Log
        </button>
      </form>
      <label className="flex items-center gap-1.5 text-[13px] text-muted" htmlFor="time-when">
        Starting at
        <input
          id="time-when"
          type="time"
          value={time ?? londonClock(new Date(now)).hm}
          onChange={(e) => setTime(e.target.value || null)}
          className="rounded-lg border border-line bg-surface px-1.5 py-0.5 text-ink tabular-nums"
        />
        {time ? (
          <button type="button" className="link text-xs" onClick={() => setTime(null)}>
            use now
          </button>
        ) : (
          <span>(change if you’re logging late)</span>
        )}
      </label>
      {error && (
        <p role="alert" className="text-[13px] text-error">
          {error}
        </p>
      )}

      <section className="card pt-1.5 pb-2">
        <div className="flex items-center justify-between pt-3">
          <span className="label">Today</span>
          <span className="text-[13px] text-muted">newest first · tap to edit</span>
        </div>
        {todays.length === 0 && <p className="py-3 text-sm text-muted">Nothing logged today. Tap what you’re doing to start.</p>}
        {todays.map(({ e, i }) => (
          <EntryRow
            key={e.id}
            entry={e}
            current={i === ci}
            durationMs={endOf(optimistic, i, now) - Date.parse(e.startedAt)}
            category={catOf(e)}
            onCategorise={() => !e.id.startsWith("pending") && openPicker(e)}
          />
        ))}
      </section>

      {picker && (
        <CategoryPicker
          entry={picker}
          current={picker.current}
          categories={categories}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
