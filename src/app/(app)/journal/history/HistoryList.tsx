"use client";

import { useMemo, useState, useTransition } from "react";
import { AutoTextarea } from "@/components/AutoTextarea";
import { FeelingTags } from "@/components/FeelingChips";
import { STATUS_LABEL, useAutosave } from "@/components/useAutosave";
import { formatDay, longDay } from "@/lib/day";
import type { JournalEntry } from "@/lib/journal";
import { deleteEntry, saveEntry } from "../actions";

const PAGE = 20;

/** Every entry in full, newest first, editable in place like a notes app. */
export function HistoryList({ entries }: { entries: JournalEntry[] }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        !deleted.has(e.date) &&
        (!q || e.body.toLowerCase().includes(q) || e.feelings.some((f) => f.toLowerCase().includes(q))),
    );
  }, [entries, query, deleted]);

  const visible = filtered.slice(0, shown);
  const groups: { month: string; items: JournalEntry[] }[] = [];
  for (const e of visible) {
    const month = formatDay(e.date, { month: "long", year: "numeric" });
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(e);
    else groups.push({ month, items: [e] });
  }

  return (
    <>
      <input
        type="search"
        aria-label="Search entries"
        placeholder="Search entries"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShown(PAGE);
        }}
        className="field py-2.5"
      />
      <section className="card py-2.5">
        {groups.length === 0 && <p className="py-3 text-sm text-muted">No entries match.</p>}
        {groups.map((g) => (
          <div key={g.month}>
            <h2 className="mt-1.5 mb-0.5 font-serif text-[22px] font-semibold">{g.month}</h2>
            {g.items.map((e) => (
              <EntryCard key={e.date} entry={e} onDeleted={() => setDeleted((s) => new Set(s).add(e.date))} />
            ))}
          </div>
        ))}
        {shown < filtered.length && (
          <button className="link block w-full py-3 text-center" onClick={() => setShown((s) => s + PAGE)}>
            Show older entries
          </button>
        )}
      </section>
      <p className="text-center text-[13px] text-muted">Tap any entry to add to it. Changes save as you type.</p>
    </>
  );
}

function EntryCard({ entry, onDeleted }: { entry: JournalEntry; onDeleted: () => void }) {
  const [body, setBody] = useState(entry.body);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { status, schedule, flush } = useAutosave(() => saveEntry(entry.date, entry.feelings, body));

  return (
    <article className="border-b border-line py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14.5px] font-semibold">
          {longDay(entry.date)}
          {!entry.doneAt && <span className="ml-2 text-xs font-normal text-camel">Draft</span>}
        </span>
        <span className={`text-xs ${status === "error" ? "text-error" : "text-muted"}`} aria-live="polite">
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className="mt-1.5">
        <FeelingTags feelings={entry.feelings} />
      </div>
      <AutoTextarea
        aria-label={`Entry for ${longDay(entry.date)}`}
        value={body}
        placeholder="Nothing written for this day."
        onChange={(e) => {
          setBody(e.target.value);
          schedule();
        }}
        onBlur={() => void flush()}
        className="mt-2 rounded-lg text-[18.5px] focus:bg-pill/45"
      />
      <div className="mt-1 flex justify-end gap-3 text-xs">
        {confirming ? (
          <>
            <span className="text-muted">Delete this entry for good?</span>
            <button
              className="font-semibold text-error"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteEntry(entry.date);
                  if (res.ok) onDeleted();
                  else setError(res.error);
                })
              }
            >
              Delete
            </button>
            <button className="text-muted" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </>
        ) : (
          <button className="text-faint underline underline-offset-2" onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
      {error && <p className="text-right text-xs text-error">{error}</p>}
    </article>
  );
}
