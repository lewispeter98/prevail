"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { shortDay } from "@/lib/day";
import type { Objective } from "@/lib/goals";
import { markObjective, setObjective } from "../actions";

type Props = {
  month: string;
  title: string;
  note: string;
  objectives: Objective[];
  canTick: boolean;
};

export function MonthObjectives({ month, title, note, objectives, canTick }: Props) {
  const bySlot = new Map(objectives.map((o) => [o.slot, o]));
  const achieved = objectives.filter((o) => o.achievedOn).length;

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3">
        <span className="label">{title}</span>
        {canTick && (
          <span className="flex gap-[5px]" aria-label={`${achieved} of 3 achieved`}>
            {[1, 2, 3].map((s) => (
              <i
                key={s}
                className={`size-2.5 rounded-full border-[1.5px] ${
                  bySlot.get(s)?.achievedOn ? "border-green-ink bg-green-ink" : "border-faint"
                }`}
              />
            ))}
          </span>
        )}
      </div>
      <div className="mt-1">
        {[1, 2, 3].map((slot) => (
          <Slot key={slot} month={month} slot={slot} objective={bySlot.get(slot)} canTick={canTick} />
        ))}
      </div>
      <p className="mt-2.5 text-[13px] text-muted">{note}</p>
    </section>
  );
}

function Slot({
  month,
  slot,
  objective,
  canTick,
}: {
  month: string;
  slot: number;
  objective?: Objective;
  canTick: boolean;
}) {
  const [text, setText] = useState(objective?.text ?? "");
  const [saved, setSaved] = useState(objective?.text ?? "");
  const [achievedOn, setAchievedOn] = useState(objective?.achievedOn ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const on = achievedOn != null;

  function save() {
    if (text.trim() === saved.trim()) return;
    startTransition(async () => {
      const res = await setObjective(month, slot, text);
      if (res.ok) {
        setSaved(text);
        setError(null);
      } else setError(res.error);
    });
  }

  function toggle() {
    const next = !on;
    const previous = achievedOn;
    setAchievedOn(next ? "today" : null);
    startTransition(async () => {
      const res = await markObjective(month, slot, next);
      if (!res.ok) {
        setAchievedOn(previous);
        setError(res.error);
      } else setError(null);
    });
  }

  return (
    <div className="flex items-start gap-3.5 border-b border-line py-3.5 last:border-b-0">
      {canTick && (
        <button
          type="button"
          onClick={toggle}
          disabled={pending || !saved.trim()}
          aria-pressed={on}
          aria-label={on ? `Mark “${saved}” as not achieved` : `Mark “${saved || `objective ${slot}`}” as achieved`}
          className={`mt-1 grid size-[26px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors disabled:opacity-40 ${
            on ? "border-green bg-green text-on-green" : "border-faint text-transparent"
          }`}
        >
          <CheckIcon width={14} height={14} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <input
          aria-label={`Objective ${slot}`}
          value={text}
          placeholder={`Objective ${slot}`}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={`w-full border-0 border-b border-dashed border-transparent bg-transparent py-0.5 font-serif text-[20px] leading-[1.25] font-medium outline-none placeholder:text-faint focus:border-line ${
            on ? "text-muted" : "text-ink"
          }`}
        />
        {canTick && saved.trim() && (
          <div className="text-[13px] text-muted">
            {on ? `Achieved${achievedOn && achievedOn !== "today" ? ` ${shortDay(achievedOn)}` : " today"}` : "In progress"}
          </div>
        )}
        {error && <div className="text-[12.5px] text-error">{error}</div>}
      </div>
    </div>
  );
}
