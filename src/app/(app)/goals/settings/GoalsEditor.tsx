"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AutoTextarea } from "@/components/AutoTextarea";
import type { LifeGoal } from "@/lib/goals";
import { saveLifeGoals } from "../actions";

type Row = { key: string; id?: string; text: string };

let nextKey = 0;
const newKey = () => `new-${nextKey++}`;

export function GoalsEditor({ initial }: { initial: LifeGoal[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length ? initial.map((g) => ({ key: g.id, id: g.id, text: g.text })) : [{ key: newKey(), text: "" }],
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const change = (next: Row[]) => {
    setRows(next);
    setMessage(null);
  };
  const move = (i: number, by: number) => {
    const next = [...rows];
    const [r] = next.splice(i, 1);
    next.splice(i + by, 0, r);
    change(next);
  };

  return (
    <div className="mt-4">
      <ol className="flex flex-col">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-start gap-2 border-b border-line py-2.5 last:border-b-0">
            <span className="w-6 pt-1.5 text-[11px] font-bold tracking-[0.1em] text-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <AutoTextarea
              aria-label={`Goal ${i + 1}`}
              placeholder="I am…"
              value={r.text}
              onChange={(e) => change(rows.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              className="flex-1 text-[19px] leading-[1.35]"
            />
            <div className="flex shrink-0 flex-col items-center gap-0.5 text-muted">
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="grid size-7 place-items-center rounded-full disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === rows.length - 1}
                onClick={() => move(i, 1)}
                className="grid size-7 place-items-center rounded-full disabled:opacity-25"
              >
                ↓
              </button>
            </div>
            <button
              type="button"
              aria-label={`Remove goal ${i + 1}`}
              onClick={() => change(rows.filter((_, j) => j !== i))}
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted"
            >
              ×
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="btn btn-ghost mt-3"
        onClick={() => change([...rows, { key: newKey(), text: "" }])}
      >
        Add a goal
      </button>
      <button
        type="button"
        className="btn mt-2"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await saveLifeGoals(rows.map(({ id, text }) => ({ id, text })));
            if (!res.ok) return setMessage({ ok: false, text: res.error });
            setMessage({ ok: true, text: "Goals saved" });
            router.refresh();
          })
        }
      >
        {pending ? "Saving…" : "Save goals"}
      </button>
      {message && (
        <p role="status" className={`mt-2 text-center text-[13.5px] ${message.ok ? "text-green-ink" : "text-error"}`}>
          {message.text}
        </p>
      )}
      <p className="mt-3 text-[12.5px] text-muted">
        Removing a goal retires it. Days you&apos;ve already scripted keep the wording you wrote that day.
      </p>
    </div>
  );
}
