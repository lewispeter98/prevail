"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DayKey } from "@/lib/day";
import type { TimeEntry } from "@/lib/timeCore";
import { addEntryOnDay } from "../actions";

/**
 * "＋ Add entry" for the Day timeline: a time and what you were doing, saved
 * on the day being viewed. Suggests activities you've logged before.
 */
export function AddEntry({
  day,
  defaultTime,
  suggestions,
  onAdded,
}: {
  day: DayKey;
  defaultTime: string;
  suggestions: string[];
  onAdded: (entry: TimeEntry) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(defaultTime);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          setTime(defaultTime);
          setLabel("");
          setError(null);
          setOpen(true);
        }}
        className="mt-1 w-full rounded-xl border border-dashed border-line py-2.5 text-[14px] font-semibold text-green-ink"
      >
        ＋ Add entry
      </button>
    );

  return (
    <form
      className="mt-2 rounded-2xl border border-line bg-bg p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await addEntryOnDay(day, time, label);
          if (!res.ok) return setError(res.error);
          onAdded(res.entry);
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <div className="label">Add an entry</div>
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
        <input
          type="time"
          aria-label="Start time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border border-line bg-surface px-2 py-2 tabular-nums"
        />
        <input
          aria-label="What you were doing"
          placeholder="What were you doing?"
          autoFocus
          list="time-activity-suggestions"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="min-w-0 rounded-lg border border-line bg-surface px-2.5 py-2"
          autoComplete="off"
        />
        <datalist id="time-activity-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <p className="mt-1.5 text-xs text-muted">It runs until the next entry, and the day’s totals update to match.</p>
      {error && <p className="mt-1.5 text-[13px] text-error">{error}</p>}
      <div className="mt-2.5 flex justify-end gap-4 text-[14px]">
        <button type="button" className="text-muted" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn w-auto px-5 py-2" disabled={pending || !label.trim() || !time}>
          {pending ? "Saving…" : "Add"}
        </button>
      </div>
    </form>
  );
}
