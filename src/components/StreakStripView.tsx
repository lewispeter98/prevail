"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StreakKind } from "@/lib/streaks";
import { Crest } from "./Crest";
import { CheckIcon, JournalIcon, ScriptIcon, WeightIcon } from "./icons";

type S = { count: number; doneToday: boolean; best: number };

type Props = {
  super: S;
  own: S & { kind: StreakKind; label: string };
  today: Record<StreakKind, boolean>;
};

const ICONS = { weight: WeightIcon, script: ScriptIcon, journal: JournalIcon };
const TASKS: { kind: StreakKind; label: string; href: string }[] = [
  { kind: "weight", label: "Log your weight", href: "/weight" },
  { kind: "script", label: "Write out your goals", href: "/goals" },
  { kind: "journal", label: "Finish your journal", href: "/journal" },
];

const MILESTONES: Record<number, string> = {
  7: "One week.",
  14: "Two weeks.",
  30: "A month.",
  50: "Fifty days.",
  100: "A hundred days.",
  200: "Two hundred days.",
  365: "A full year.",
};

const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

/** The super streak and this module's streak, with today's checklist and the seal moment. */
export function StreakStripView({ super: sup, own, today }: Props) {
  const [open, setOpen] = useState(false);
  const [seal, setSeal] = useState(false);
  const [prevDone, setPrevDone] = useState(sup.doneToday);
  const doneCount = Object.values(today).filter(Boolean).length;
  const OwnIcon = ICONS[own.kind];

  // Show the seal only when the super streak completes while the app is open,
  // not every time a screen loads on a day that's already complete.
  if (sup.doneToday !== prevDone) {
    setPrevDone(sup.doneToday);
    if (sup.doneToday) setSeal(true);
  }

  useEffect(() => {
    if (!seal) return;
    const t = setTimeout(() => setSeal(false), 3200);
    return () => clearTimeout(t);
  }, [seal]);

  return (
    <>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="streak-panel"
          className={`flex flex-1 items-center gap-2.5 rounded-[14px] border py-2 pr-3 pl-2 text-left ${
            sup.doneToday ? "super-lit border-transparent bg-green text-on-green" : "border-line bg-surface"
          }`}
          aria-label={`Super streak: ${plural(sup.count)}, ${doneCount} of 3 done today. Show details.`}
        >
          <span className={sup.doneToday ? "" : "opacity-55 grayscale-50"}>
            <Crest size={40} />
          </span>
          <span>
            <span className={`num block text-2xl leading-none font-semibold ${sup.doneToday ? "text-brass-light" : ""}`}>
              {sup.count}
            </span>
            <small
              className={`mt-[3px] block text-[10px] font-semibold tracking-[0.12em] uppercase ${
                sup.doneToday ? "text-brass" : "text-muted"
              }`}
            >
              {sup.doneToday ? "Super streak" : `${doneCount} of 3 today`}
            </small>
          </span>
        </button>

        <div
          className="flex flex-1 items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2"
          aria-label={`${own.label}: ${plural(own.count)}${own.doneToday ? "" : ", not done today"}`}
        >
          <OwnIcon width={24} height={24} className={own.doneToday ? "text-green-ink" : "text-muted"} />
          <div>
            <div className="num text-2xl leading-none font-semibold">{own.count}</div>
            <small
              className={`mt-[3px] block text-[10px] font-semibold tracking-[0.12em] uppercase ${
                own.doneToday ? "text-muted" : "text-camel"
              }`}
            >
              {own.doneToday ? own.label : "Not done today"}
            </small>
          </div>
        </div>
      </div>

      {open && (
        <div id="streak-panel" className="card mt-2 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label">Today</span>
            <span className="text-xs text-muted">Best super streak: {plural(sup.best)}</span>
          </div>
          <ul className="mt-1">
            {TASKS.map((t) => {
              const Icon = ICONS[t.kind];
              const done = today[t.kind];
              return (
                <li key={t.kind} className="border-b border-line last:border-b-0">
                  <Link
                    href={t.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-2.5 text-[14.5px]"
                  >
                    <Icon width={20} height={20} className={done ? "text-green-ink" : "text-muted"} />
                    <span className={`flex-1 ${done ? "text-muted line-through decoration-faint" : ""}`}>{t.label}</span>
                    {done ? (
                      <CheckIcon width={16} height={16} className="text-green-ink" />
                    ) : (
                      <span className="text-xs font-semibold text-camel">To do ›</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Do all three before 4am to keep the super streak. {own.label}: best {plural(own.best)}.
          </p>
        </div>
      )}

      {seal && <Seal count={sup.count} onClose={() => setSeal(false)} />}
    </>
  );
}

function Seal({ count, onClose }: { count: number; onClose: () => void }) {
  const milestone = MILESTONES[count];
  return (
    <div
      role="status"
      aria-live="assertive"
      onClick={onClose}
      className="seal-backdrop fixed inset-0 z-50 grid cursor-pointer place-items-center bg-[rgba(22,18,15,.88)] px-5 backdrop-blur-md"
    >
      <div className="seal-press text-center text-[#F1E9DC]">
        <div className="mx-auto w-fit">
          <Crest size={156} value={count} />
        </div>
        <div className="mt-1 font-serif text-[32px] font-semibold">Super streak</div>
        <div className="mt-1 text-[11px] font-semibold tracking-[0.16em] text-brass uppercase">
          {plural(count)} · all three done
        </div>
        {milestone && <div className="mt-3 font-serif text-xl italic text-brass-light">{milestone}</div>}
      </div>
    </div>
  );
}
