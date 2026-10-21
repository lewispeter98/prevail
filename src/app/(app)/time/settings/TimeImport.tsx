"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatDay, today as todayKey } from "@/lib/day";
import { categorise, type TimeCategory, type TimeRule } from "@/lib/timeCore";
import { parseTimeNote } from "@/lib/timeImport";
import { importTime } from "../actions";
import { CategorySelect } from "./Editors";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h3 className="mt-5 mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
      <span className="grid size-5 place-items-center rounded-full bg-ink text-[11px] tracking-normal text-bg">{n}</span>
      {children}
    </h3>
  );
}

export function TimeImport({ categories, rules }: { categories: TimeCategory[]; rules: TimeRule[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [first, setFirst] = useState(todayKey());
  const [sortTo, setSortTo] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const { days, skipped } = useMemo(() => (text.trim() ? parseTimeNote(text, first) : { days: [], skipped: [] }), [text, first]);
  const counts = new Map<string, number>();
  for (const d of days) for (const it of d.items) counts.set(it.label.toLowerCase(), (counts.get(it.label.toLowerCase()) ?? 0) + 1);
  const labels = [...counts.keys()];
  const unmatched = labels.filter((l) => !categorise(l, null, rules) && !sortTo[l]);
  const toSort = labels.filter((l) => !categorise(l, null, rules));
  const matched = labels.filter((l) => categorise(l, null, rules));
  const byId = new Map(categories.map((c) => [c.id, c]));
  const total = days.reduce((a, d) => a + d.items.length, 0);
  const firstName = days[0] ? formatDay(days[0].date, { weekday: "long" }) : "the top day";

  return (
    <div>
      <Step n={1}>Paste your note</Step>
      <p className="text-[13px] text-muted">Open your time tracker note, copy everything and paste it here.</p>
      <textarea
        aria-label="Pasted note"
        rows={7}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        placeholder={"Sunday\n07:30 wake up\n08:45 work\n…\n\nFriday\n…"}
        className="field mt-2 text-sm"
      />

      {days.length > 0 && (
        <>
          <Step n={2}>Check the dates</Step>
          <label htmlFor="first-date" className="text-[13px] text-muted">
            Your note uses day names. What date is the first one ({firstName})?
          </label>
          <input
            id="first-date"
            type="date"
            value={first}
            max={todayKey()}
            onChange={(e) => e.target.value && setFirst(e.target.value)}
            className="field mt-1.5"
          />
          <div className="mt-1">
            {days.map((d) => (
              <div key={d.date} className="flex justify-between gap-3 border-b border-line py-2 text-sm">
                <b className="font-semibold">{formatDay(d.date, { weekday: "long", day: "numeric", month: "long" })}</b>
                <span className="text-muted">
                  {d.items.length} entries · {d.items[0].hm}–{d.items[d.items.length - 1].hm}
                </span>
              </div>
            ))}
          </div>
          {days.some((d) => d.date > todayKey()) && (
            <p className="mt-2 text-[13px] text-error">Some dates are in the future. Check the date above.</p>
          )}
          {skipped.length > 0 && (
            <p className="mt-2 text-[13px] text-camel">
              {skipped.length} line{skipped.length === 1 ? "" : "s"} without a time will be left out, e.g. “{skipped[0].slice(0, 40)}”.
            </p>
          )}

          <Step n={3}>Sort new activities</Step>
          {toSort.length ? (
            <>
              <p className="text-[13px] text-muted">
                These don’t match a category yet. Pick one for each and Prevail will remember it.
              </p>
              {toSort.map((l) => (
                <div key={l} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start gap-2.5 border-b border-line py-2.5">
                  <span className="min-w-0 pt-2 break-words">
                    {l} <span className="text-[13px] text-muted">×{counts.get(l)}</span>
                  </span>
                  <CategorySelect
                    label={`Category for ${l}`}
                    value={sortTo[l] ?? ""}
                    onChange={(id) => setSortTo((s) => ({ ...s, [l]: id }))}
                    categories={categories}
                    emptyLabel="Leave uncategorised"
                  />
                </div>
              ))}
            </>
          ) : (
            <p className="text-[13px] text-muted">Everything matches a category already.</p>
          )}
          {matched.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] text-muted">
                {matched.length} {matched.length === 1 ? "activity" : "activities"} matched automatically
              </summary>
              {matched.map((l) => {
                const c = byId.get(categorise(l, null, rules)!);
                return (
                  <div key={l} className="flex items-center justify-between gap-3 py-1.5 text-[13.5px]">
                    <span className="min-w-0 break-words">
                      {l} <span className="text-muted">×{counts.get(l)}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs font-semibold">
                      <span className="size-2 rounded-full" style={{ background: c?.colour }} />
                      {c?.name}
                    </span>
                  </div>
                );
              })}
            </details>
          )}

          <button
            type="button"
            className="btn mt-4"
            disabled={pending || days.some((d) => d.date > todayKey())}
            onClick={() =>
              startTransition(async () => {
                const res = await importTime(
                  days.map((d) => ({ date: d.date, items: d.items })),
                  Object.entries(sortTo)
                    .filter(([, id]) => id)
                    .map(([keyword, categoryId]) => ({ keyword, categoryId })),
                );
                if (res.ok) {
                  router.refresh();
                  setResult({
                    ok: true,
                    text: `Imported ${res.imported} entries${res.skipped ? `, skipped ${res.skipped} already in Prevail` : ""}.`,
                  });
                  setText("");
                  setSortTo({});
                } else setResult({ ok: false, text: res.error });
              })
            }
          >
            {pending ? "Importing…" : `Import ${total} entries${unmatched.length ? ` (${unmatched.length} left uncategorised)` : ""}`}
          </button>
        </>
      )}
      {result && (
        <p role="status" className={`mt-2 text-[13.5px] ${result.ok ? "text-green-ink" : "text-error"}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}
