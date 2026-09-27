"use client";

import { useState, useTransition } from "react";
import { generateWeeklyReview } from "../actions";

export function GenerateWeekly({ monday, label, subtle = false }: { monday: string; label: string; subtle?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setError(null);
      const res = await generateWeeklyReview(monday);
      if (!res.ok) setError(res.error);
    });

  return (
    <div className="mt-4">
      {subtle ? (
        <button className="link text-[13px]" onClick={run} disabled={pending}>
          {pending ? "Rewriting… this takes up to a minute" : label}
        </button>
      ) : (
        <button className="btn" onClick={run} disabled={pending}>
          {pending ? "Writing your review… up to a minute" : label}
        </button>
      )}
      {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
    </div>
  );
}
