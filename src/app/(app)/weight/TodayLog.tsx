"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { fmtKg, parseKg } from "@/lib/weightStats";
import { saveTodayWeight } from "./actions";

type Props = {
  todayKg: number | null;
  last: { kg: number; label: string } | null;
};

export function TodayLog({ todayKg, last }: Props) {
  const [editing, setEditing] = useState(todayKg == null);
  const [value, setValue] = useState(todayKg != null ? fmtKg(todayKg) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const valid = parseKg(value) != null;

  function save() {
    if (!valid) {
      setError("Enter a weight between 20 and 300 kg.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveTodayWeight(value);
      if (res.ok) setEditing(false);
      else setError(res.error);
    });
  }

  if (!editing && todayKg != null) {
    return (
      <section className="card px-5 pt-[26px] pb-[22px] text-center">
        <div className="label">Today&apos;s weight</div>
        <div className="mt-1.5 mb-[18px] flex items-baseline justify-center gap-1.5">
          <span className="num text-[96px] leading-[1.05] font-medium tracking-[-0.02em]">{fmtKg(todayKg)}</span>
          <span className="font-serif text-[26px] text-muted">kg</span>
        </div>
        <div className="flex items-center justify-center gap-3.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-soft px-3.5 py-[7px] text-[13.5px] font-semibold text-green-ink">
            <CheckIcon width={14} height={14} />
            Logged for today
          </span>
          <button className="link" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card px-5 pt-[26px] pb-[22px] text-center">
      <label htmlFor="today-kg" className="label">
        Today&apos;s weight
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="mt-1.5 mb-[18px] flex items-baseline justify-center gap-1.5">
          <input
            id="today-kg"
            aria-label="Today's weight in kilograms"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder={last ? fmtKg(last.kg) : "0.0"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ width: `${Math.max(3, (value || (last ? fmtKg(last.kg) : "0.0")).length) * 0.62 + 0.3}em` }}
            className="num border-0 bg-transparent p-0 text-center text-[96px] leading-[1.05] font-medium tracking-[-0.02em] text-ink outline-none placeholder:text-faint"
          />
          <span className="font-serif text-[26px] text-muted">kg</span>
        </div>
        <button type="submit" className="btn" disabled={!value.trim() || pending}>
          {pending ? "Saving…" : "Save weight"}
        </button>
      </form>
      {error ? (
        <p className="mt-3 text-[13px] text-error">{error}</p>
      ) : (
        <p className="mt-3 text-[13px] text-muted">
          {last ? `Last logged ${fmtKg(last.kg)} kg · ${last.label}` : "Your first weigh-in starts the streak."}
        </p>
      )}
      {todayKg != null && (
        <button className="link mt-2" onClick={() => setEditing(false)}>
          Cancel
        </button>
      )}
    </section>
  );
}
