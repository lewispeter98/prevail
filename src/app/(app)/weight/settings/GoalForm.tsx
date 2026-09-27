"use client";

import { useState, useTransition } from "react";
import { setGoalWeight } from "../actions";

export function GoalForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await setGoalWeight(value);
          setMessage(res.ok ? { ok: true, text: value.trim() ? "Goal saved" : "Goal cleared" } : { ok: false, text: res.error });
        });
      }}
    >
      <div className="relative flex-1">
        <label htmlFor="goal-kg" className="sr-only">
          Goal weight in kg
        </label>
        <input
          id="goal-kg"
          inputMode="decimal"
          placeholder="e.g. 80.0"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMessage(null);
          }}
          className="field num pr-10 text-xl font-semibold"
        />
        <span className="absolute top-1/2 right-3.5 -translate-y-1/2 font-serif text-muted">kg</span>
      </div>
      <button type="submit" className="btn w-auto px-6" disabled={pending}>
        Save
      </button>
      {message && (
        <span role="status" className={`text-[13px] ${message.ok ? "text-green-ink" : "text-error"}`}>
          {message.text}
        </span>
      )}
    </form>
  );
}
