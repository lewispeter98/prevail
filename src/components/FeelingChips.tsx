"use client";

import { FEELINGS } from "@/lib/feelings";

const MARKS = new Map(FEELINGS.map((f) => [f.name, f.mark]));

/** Toggleable feeling chips. */
export function FeelingPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="mt-3.5 flex flex-wrap gap-2">
      {FEELINGS.map(({ name, mark }) => {
        const on = value.includes(name);
        return (
          <button
            key={name}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((f) => f !== name) : [...value, name])}
            className={`inline-flex items-center gap-[7px] rounded-full border px-3.5 py-2 text-sm transition-colors ${
              on ? "border-ink bg-ink text-bg" : "border-line text-ink"
            }`}
          >
            <span className={`text-xs ${on ? "text-bg" : "text-muted"}`}>{mark}&#xFE0E;</span>
            {name}
          </button>
        );
      })}
    </div>
  );
}

/** Small read-only chips. */
export function FeelingTags({ feelings }: { feelings: string[] }) {
  if (feelings.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-[5px]">
      {feelings.map((f) => (
        <span key={f} className="rounded-full border border-line px-[9px] py-[2px] text-[11.5px] text-ink">
          <span className="mr-1 text-[10px] text-muted">{MARKS.get(f)}&#xFE0E;</span>
          {f}
        </span>
      ))}
    </div>
  );
}
