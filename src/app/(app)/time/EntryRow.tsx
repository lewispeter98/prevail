"use client";

import { useState, useTransition } from "react";
import { londonClock } from "@/lib/day";
import { fmtDuration, type TimeCategory, type TimeEntry } from "@/lib/timeCore";
import { deleteEntry, updateEntry } from "./actions";

export function CategoryChip({
  category,
  onClick,
}: {
  category: TimeCategory | null;
  onClick: () => void;
}) {
  return category ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Category ${category.name}, change`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line py-[3px] pr-2.5 pl-2 text-xs font-semibold whitespace-nowrap"
    >
      <span className="size-2 rounded-full" style={{ background: category.colour }} />
      {category.name}
    </button>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full border border-dashed border-camel px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap text-camel"
    >
      Categorise
    </button>
  );
}

/** One line of a timeline: time, what, how long, category. Tap the time or text to edit. */
export function EntryRow({
  entry,
  durationMs,
  current,
  category,
  onCategorise,
  onSaved,
}: {
  entry: TimeEntry;
  durationMs: number;
  current: boolean;
  category: TimeCategory | null;
  onCategorise: () => void;
  /** Called after an edit or delete is saved. */
  onSaved?: () => void;
}) {
  const hm = londonClock(new Date(entry.startedAt)).hm;
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(hm);
  const [label, setLabel] = useState(entry.label);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setEditing(false);
        onSaved?.();
      }
      else setError(res.error ?? "Couldn't save that.");
    });

  const startEditing = () => {
    setTime(hm);
    setLabel(entry.label);
    setError(null);
    setEditing(true);
  };

  if (editing)
    return (
      <form
        className="grid grid-cols-[auto_1fr] gap-2 border-b border-line py-2.5 last:border-b-0"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateEntry(entry.id, time, label));
        }}
      >
        <input
          type="time"
          aria-label="Start time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-line bg-bg px-2 py-1.5 tabular-nums"
        />
        <input
          aria-label="What you were doing"
          value={label}
          autoFocus
          onChange={(e) => setLabel(e.target.value)}
          className="min-w-0 rounded-lg border border-line bg-bg px-2.5 py-1.5"
        />
        {error && <p className="col-span-2 text-xs text-error">{error}</p>}
        <div className="col-span-2 flex justify-end gap-4 text-[13px]">
          <button type="button" className="text-error" disabled={pending} onClick={() => run(() => deleteEntry(entry.id))}>
            Delete
          </button>
          <button type="button" className="text-muted" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button type="submit" className="link" disabled={pending}>
            Save
          </button>
        </div>
      </form>
    );

  return (
    <div className="grid grid-cols-[52px_1fr_auto] items-center gap-2.5 border-b border-line py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={startEditing}
        aria-label={`Edit ${hm} ${entry.label}`}
        className="num text-left text-[17px] font-semibold"
      >
        {hm}
      </button>
      <button type="button" onClick={startEditing} className="min-w-0 text-left break-words">
        <span className={current ? "font-semibold" : ""}>{entry.label}</span>
        <span className="block text-[11.5px] text-muted tabular-nums">
          {current ? "now · " : ""}
          {fmtDuration(durationMs)}
        </span>
      </button>
      <CategoryChip category={category} onClick={onCategorise} />
    </div>
  );
}
