"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { isWritten, overlay } from "@/lib/scriptMatch";
import { submitScript } from "./actions";

type Props = { date: string; goals: string[]; done: boolean };

const draftKey = (date: string) => `prevail:script:${date}`;

function loadDraft(date: string, goals: string[]): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey(date)) ?? "null");
    if (Array.isArray(saved) && saved.length === goals.length) return saved.map(String);
  } catch {}
  return goals.map(() => "");
}

/** Today's goals as faint outlines, written over in ink. */
export function ScriptBoard({ date, goals, done: initiallyDone }: Props) {
  const [typed, setTyped] = useState<string[]>(() => (initiallyDone ? goals : goals.map(() => "")));
  const [done, setDone] = useState(initiallyDone);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Restore a half-written script on this device (e.g. after closing the app).
  // Browser storage only exists after hydration, so this has to run in an effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!initiallyDone) setTyped(loadDraft(date, goals));
  }, [date, goals, initiallyDone]);

  const written = goals.map((g, i) => isWritten(typed[i] ?? "", g));
  const count = written.filter(Boolean).length;

  function update(i: number, value: string) {
    const next = typed.map((t, j) => (j === i ? value.replace(/\n/g, "") : t));
    setTyped(next);
    try {
      localStorage.setItem(draftKey(date), JSON.stringify(next));
    } catch {}
    // Move on to the next unfinished goal once this one is complete.
    if (isWritten(next[i], goals[i]) && !isWritten(typed[i], goals[i])) {
      const nextIndex = goals.findIndex((g, j) => j > i && !isWritten(next[j], g));
      if (nextIndex >= 0) document.getElementById(`goal-${nextIndex}`)?.focus();
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitScript(typed);
      if (!res.ok) return setError(res.error);
      setDone(true);
      try {
        localStorage.removeItem(draftKey(date));
      } catch {}
    });
  }

  return (
    <>
      <section className="card">
        <div className="flex items-start justify-between gap-3">
          <p className="font-serif text-[19px] leading-[1.35] italic text-muted">
            {done ? "Written for today." : "Write them out. Every word, every day."}
          </p>
          <Link href="/goals/settings" className="link mt-1 shrink-0">
            Edit goals
          </Link>
        </div>

        <div className="mt-2">
          {goals.map((goal, i) => (
            <div key={i} className="border-b border-line pt-3.5 pb-3 last:border-b-0">
              <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold tracking-[0.14em] text-faint">
                <span>GOAL {String(i + 1).padStart(2, "0")}</span>
                {written[i] && (
                  <span className="inline-flex items-center gap-1 tracking-[0.1em] text-green-ink">
                    <CheckIcon width={12} height={12} />
                    WRITTEN
                  </span>
                )}
              </div>
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="pointer-events-none min-h-[1.32em] font-serif text-[23px] leading-[1.32] font-medium break-words whitespace-pre-wrap"
                >
                  {overlay(goal, typed[i] ?? "").map((c, k) => (
                    <span
                      key={k}
                      className={
                        c.state === "ghost"
                          ? "text-ghost"
                          : c.state === "wrong"
                            ? "text-error underline decoration-[1.5px] underline-offset-4"
                            : written[i]
                              ? "text-green-ink"
                              : "text-ink"
                      }
                    >
                      {c.char}
                    </span>
                  ))}
                </div>
                <textarea
                  id={`goal-${i}`}
                  aria-label={`Write goal ${i + 1}: ${goal}`}
                  value={typed[i] ?? ""}
                  readOnly={done}
                  rows={1}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  onChange={(e) => update(i, e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    setNotice("Paste is off. Write it out.");
                  }}
                  onDrop={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById(`goal-${i + 1}`)?.focus();
                    }
                  }}
                  className="absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-serif text-[23px] leading-[1.32] font-medium break-words whitespace-pre-wrap text-transparent caret-camel outline-none"
                  style={{ WebkitTextFillColor: "transparent" }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p role="alert" className="text-center text-[13.5px] text-error">
          {error}
        </p>
      )}

      <button className="btn" disabled={done || pending || count !== goals.length} onClick={submit}>
        {done ? "Scripted for today ✓" : pending ? "Saving…" : `Submit today's script · ${count}/${goals.length}`}
      </button>
      <p className="text-center text-[13px] text-muted" aria-live="polite">
        {notice ?? "Paste is switched off. Capitals and extra spaces don't matter."}
      </p>
    </>
  );
}
