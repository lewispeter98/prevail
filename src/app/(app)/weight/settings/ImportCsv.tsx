"use client";

import { useMemo, useState, useTransition } from "react";
import { shortDay } from "@/lib/day";
import { parseWeightCsv, type ParsedWeights } from "@/lib/csvWeights";
import { fmtKg } from "@/lib/weightStats";
import { importWeights } from "../actions";

export function ImportCsv({ existing }: { existing: string[] }) {
  const [parsed, setParsed] = useState<(ParsedWeights & { name: string }) | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const existingSet = useMemo(() => new Set(existing), [existing]);

  const clashes = parsed ? parsed.rows.filter((r) => existingSet.has(r.date)).length : 0;
  const newRows = parsed ? parsed.rows.length - clashes : 0;
  const count = overwrite ? (parsed?.rows.length ?? 0) : newRows;

  async function onFile(file: File | undefined) {
    setResult(null);
    if (!file) return setParsed(null);
    const text = await file.text();
    setParsed({ ...parseWeightCsv(text), name: file.name });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="btn btn-ghost cursor-pointer text-center">
        {parsed ? `Chosen: ${parsed.name}` : "Choose CSV file"}
        <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {parsed && (
        <div className="rounded-xl border border-line bg-bg p-3.5 text-[13.5px]">
          {parsed.rows.length === 0 ? (
            <p className="text-error">No dates and weights found. Check the file has a date column and a weight column.</p>
          ) : (
            <>
              <p>
                <b>{parsed.rows.length}</b> weigh-ins from <b>{shortDay(parsed.rows[0].date)} {parsed.rows[0].date.slice(0, 4)}</b> to{" "}
                <b>
                  {shortDay(parsed.rows[parsed.rows.length - 1].date)} {parsed.rows[parsed.rows.length - 1].date.slice(0, 4)}
                </b>
                .
              </p>
              <ul className="mt-2 text-muted">
                {parsed.rows.slice(-3).reverse().map((r) => (
                  <li key={r.date} className="flex justify-between">
                    <span>{shortDay(r.date)} {r.date.slice(0, 4)}</span>
                    <span className="num text-[15px] text-ink">{fmtKg(r.kg)} kg</span>
                  </li>
                ))}
              </ul>
              {parsed.skipped.length > 0 && (
                <p className="mt-2 text-camel">
                  {parsed.skipped.length} line{parsed.skipped.length === 1 ? "" : "s"} couldn&apos;t be read and will be
                  left out, e.g. “{parsed.skipped[0].slice(0, 40)}”.
                </p>
              )}
              {clashes > 0 && (
                <label className="mt-3 flex items-start gap-2.5">
                  <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="mt-1" />
                  <span>
                    {clashes} of these days already have a weight in Prevail. Replace them with the file&apos;s values
                    (otherwise they&apos;re skipped).
                  </span>
                </label>
              )}
            </>
          )}
        </div>
      )}

      {parsed && parsed.rows.length > 0 && (
        <button
          className="btn"
          disabled={pending || count === 0}
          onClick={() =>
            startTransition(async () => {
              const res = await importWeights(parsed.rows, overwrite);
              if (res.ok) {
                setResult({
                  ok: true,
                  text: `Imported ${res.imported} weigh-in${res.imported === 1 ? "" : "s"}${res.skipped ? `, skipped ${res.skipped} already logged` : ""}.`,
                });
                setParsed(null);
              } else setResult({ ok: false, text: res.error });
            })
          }
        >
          {pending ? "Importing…" : count === 0 ? "Nothing new to import" : `Import ${count} weigh-in${count === 1 ? "" : "s"}`}
        </button>
      )}

      {result && (
        <p role="status" className={`text-[13.5px] ${result.ok ? "text-green-ink" : "text-error"}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}
