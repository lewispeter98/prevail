"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AutoTextarea } from "@/components/AutoTextarea";
import { FeelingPicker } from "@/components/FeelingChips";
import { STATUS_LABEL, useAutosave } from "@/components/useAutosave";
import { longDay, type DayKey } from "@/lib/day";
import { finishEntry, regenerateReflection, saveEntry } from "./actions";

type Props = {
  date: DayKey;
  today: DayKey;
  initialFeelings: string[];
  initialBody: string;
  done: boolean;
  reflection: string | null;
};

export function JournalEditor({ date, today, initialFeelings, initialBody, done: initiallyDone, reflection: initialReflection }: Props) {
  const router = useRouter();
  const [feelings, setFeelings] = useState(initialFeelings);
  const [body, setBody] = useState(initialBody);
  const [done, setDone] = useState(initiallyDone);
  const [reflection, setReflection] = useState(initialReflection);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dateInput = useRef<HTMLInputElement>(null);
  const isToday = date === today;

  // The hook always calls the latest version of this closure, so it saves current state.
  const { status, schedule, flush } = useAutosave(() => saveEntry(date, feelings, body));

  const hasContent = body.trim().length > 0 || feelings.length > 0;

  function finish() {
    setError(null);
    startTransition(async () => {
      await flush();
      const res = await finishEntry(date, feelings, body);
      if (!res.ok) return setError(res.error);
      setDone(true);
      setReflection(res.reflection);
      if (res.reflectionError) setError(res.reflectionError);
    });
  }

  function regenerate() {
    setError(null);
    startTransition(async () => {
      await flush();
      const res = await regenerateReflection(date);
      if (res.ok) setReflection(res.reflection);
      else setError(res.error);
    });
  }

  function pickDate(value: string) {
    if (!value || value === date) return;
    void flush().then(() => router.push(value === today ? "/journal" : `/journal?date=${value}`));
  }

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => {
            const el = dateInput.current;
            if (!el) return;
            try {
              el.showPicker();
            } catch {
              el.focus();
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-[5px] text-[13px] text-muted"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <rect x="4" y="5" width="16" height="15" rx="3" />
            <path d="M4 10h16M9 3v4M15 3v4" />
          </svg>
          Entry for {isToday ? "today" : longDay(date)}
        </button>
        <input
          ref={dateInput}
          type="date"
          aria-label="Choose which day to write for"
          value={date}
          max={today}
          onChange={(e) => pickDate(e.target.value)}
          className="sr-only"
        />
        {!isToday && (
          <p className="mt-1.5 text-[13px] text-muted">
            Writing for a past day. It&apos;s saved to that day but doesn&apos;t count towards your streak.{" "}
            <button className="link text-[13px]" onClick={() => pickDate(today)}>
              Back to today
            </button>
          </p>
        )}
      </div>

      <section className="card">
        <div className="label">How are you feeling?</div>
        <FeelingPicker
          value={feelings}
          onChange={(next) => {
            setFeelings(next);
            schedule();
          }}
        />
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="journal-body" className="label">
            What&apos;s on your mind?
          </label>
          <span className={`text-xs ${status === "error" ? "text-error" : "text-muted"}`} aria-live="polite">
            {STATUS_LABEL[status]}
          </span>
        </div>
        <AutoTextarea
          id="journal-body"
          minRows={7}
          placeholder="Write freely. This is just for you…"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            schedule();
          }}
          onBlur={() => void flush()}
          className="mt-2.5"
        />
      </section>

      {reflection && (
        <section className="rounded-[20px] bg-green p-5 text-on-green">
          <div className="flex items-center justify-between gap-3">
            <span className="label text-brass">{isToday ? "Today's reflection" : "Reflection"}</span>
            <button onClick={regenerate} disabled={pending} className="text-xs text-brass underline underline-offset-2">
              {pending ? "Writing…" : "Rewrite"}
            </button>
          </div>
          <p className="mt-2 font-serif text-[21px] leading-[1.4] font-medium italic">{reflection}</p>
        </section>
      )}

      {error && (
        <p role="alert" className="text-center text-[13.5px] text-error">
          {error}{" "}
          {done && !reflection && (
            <button className="link text-[13.5px]" onClick={regenerate}>
              Try again
            </button>
          )}
        </p>
      )}

      {!done ? (
        <button className="btn" disabled={!hasContent || pending} onClick={finish}>
          {pending ? "Writing your reflection…" : isToday ? "Done for today" : "Done"}
        </button>
      ) : (
        <p className="text-center text-[13px] text-muted">
          {isToday ? "Done for today." : "Entry done."} You can keep editing; changes save as you type.
        </p>
      )}
    </>
  );
}
