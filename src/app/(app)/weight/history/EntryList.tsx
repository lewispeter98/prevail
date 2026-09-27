"use client";

import { useState, useTransition } from "react";
import { shortDay } from "@/lib/day";
import { fmtDelta, fmtKg, trendOf, type WeightEntry } from "@/lib/weightStats";
import { deleteWeight, updateWeight } from "../actions";

const PAGE = 30;

/** Every entry, newest first, with inline edit and delete. */
export function EntryList({ entries }: { entries: WeightEntry[] }) {
  const [shown, setShown] = useState(PAGE);
  return (
    <section className="card py-2">
      {entries.slice(0, shown).map((e, i) => (
        <Row key={e.date} entry={e} previous={entries[i + 1]} />
      ))}
      {shown < entries.length && (
        <button className="link block w-full py-3 text-center" onClick={() => setShown((s) => s + PAGE)}>
          Show older entries
        </button>
      )}
    </section>
  );
}

function Row({ entry, previous }: { entry: WeightEntry; previous?: WeightEntry }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const [value, setValue] = useState(fmtKg(entry.kg));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const delta = previous ? entry.kg - previous.kg : null;
  const t = delta == null ? "flat" : trendOf(delta);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMode("view");
        setError(null);
      } else setError(res.error ?? "Something went wrong.");
    });

  return (
    <div className="border-b border-line py-[11px] last:border-b-0">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{shortDay(entry.date)}</span>
        {mode === "edit" ? (
          <form
            className="flex items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateWeight(entry.date, value));
            }}
          >
            <input
              aria-label={`Weight for ${shortDay(entry.date)}`}
              inputMode="decimal"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="num w-[72px] rounded-lg border border-line bg-bg px-1.5 py-0.5 text-right text-[17px] font-semibold"
            />
            <button type="submit" className="link" disabled={pending}>
              Save
            </button>
            <button type="button" className="text-[12.5px] text-muted" onClick={() => setMode("view")}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <span className="num text-[19px] font-semibold">{fmtKg(entry.kg)}</span>
            <span
              className={`w-9 text-right text-[11.5px] font-semibold tabular-nums ${
                t === "down" ? "text-green-ink" : t === "up" ? "text-camel" : "text-muted"
              }`}
            >
              {delta == null ? "" : fmtDelta(delta)}
            </span>
            {mode === "confirm" ? (
              <>
                <button
                  className="text-[12.5px] font-semibold text-error"
                  disabled={pending}
                  onClick={() => run(() => deleteWeight(entry.date))}
                >
                  Delete
                </button>
                <button className="text-[12.5px] text-muted" onClick={() => setMode("view")}>
                  Keep
                </button>
              </>
            ) : (
              <>
                <button className="link text-[12.5px]" onClick={() => setMode("edit")}>
                  Edit
                </button>
                <button
                  className="text-[12.5px] text-muted underline underline-offset-2"
                  onClick={() => setMode("confirm")}
                  aria-label={`Delete ${shortDay(entry.date)}`}
                >
                  ×
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-right text-xs text-error">{error}</p>}
    </div>
  );
}
