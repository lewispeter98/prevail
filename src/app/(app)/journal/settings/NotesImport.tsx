"use client";

import { useMemo, useState, useTransition } from "react";
import { shortDay } from "@/lib/day";
import { parseNote } from "@/lib/notesImport";
import { importEntries, type ImportMode } from "../actions";

const MODES: { value: ImportMode; label: string }[] = [
  { value: "skip", label: "Keep what's in Prevail" },
  { value: "append", label: "Add the note's text below it" },
  { value: "replace", label: "Replace it with the note's text" },
];

export function NotesImport({ existing }: { existing: string[] }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ImportMode>("skip");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const existingSet = useMemo(() => new Set(existing), [existing]);
  const parsed = useMemo(() => (text.trim() ? parseNote(text, year) : null), [text, year]);
  const today = new Date().toISOString().slice(0, 10);
  const future = parsed ? parsed.entries.filter((e) => e.date > today) : [];
  const importable = parsed ? parsed.entries.filter((e) => e.date <= today) : [];
  const clashes = importable.filter((e) => existingSet.has(e.date)).length;
  const count = mode === "skip" ? importable.length - clashes : importable.length;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label htmlFor="note-year" className="label">
          Year of this note
        </label>
        <select
          id="note-year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="field w-auto py-2"
        >
          {Array.from({ length: 10 }, (_, i) => thisYear - i).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>
      <textarea
        aria-label="Pasted note"
        rows={8}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        placeholder={"24th September\nWhat you wrote that day…\n\n23rd Sept\n…"}
        className="field text-[14px]"
      />

      {parsed && (
        <div className="rounded-xl border border-line bg-bg p-3.5 text-[13.5px]">
          <div className="label mb-1.5">Preview · {importable.length} entries</div>
          {importable.length === 0 && (
            <p className="text-error">No date headings found. Each entry needs a heading like “24th September”.</p>
          )}
          <ul className="max-h-72 overflow-y-auto">
            {importable.map((e) => (
              <li key={e.date} className="flex gap-3 border-b border-line py-1.5 last:border-b-0">
                <span className="w-28 shrink-0 font-semibold">
                  {shortDay(e.date)} {e.date.slice(0, 4)}
                </span>
                <span className="min-w-0 truncate text-muted">{e.body || "(empty)"}</span>
                {existingSet.has(e.date) && <span className="shrink-0 text-camel">exists</span>}
              </li>
            ))}
          </ul>
          {parsed.invalid.length > 0 && (
            <p className="mt-2 text-camel">
              These headings aren&apos;t real dates in {year} and will be left out: {parsed.invalid.join(", ")}.
            </p>
          )}
          {future.length > 0 && (
            <p className="mt-2 text-camel">
              {future.length} {future.length === 1 ? "entry is" : "entries are"} in the future for {year}, so check the
              year. They&apos;ll be left out.
            </p>
          )}
          {parsed.preamble && (
            <p className="mt-2 text-muted">Text before the first date heading is left out: “{parsed.preamble.slice(0, 50)}”.</p>
          )}
          {clashes > 0 && (
            <fieldset className="mt-3">
              <legend className="mb-1">
                {clashes} of these days already have an entry in Prevail. For those days:
              </legend>
              {MODES.map((m) => (
                <label key={m.value} className="flex items-center gap-2 py-0.5">
                  <input type="radio" name="import-mode" checked={mode === m.value} onChange={() => setMode(m.value)} />
                  {m.label}
                </label>
              ))}
            </fieldset>
          )}
        </div>
      )}

      {parsed && importable.length > 0 && (
        <button
          className="btn"
          disabled={pending || count === 0}
          onClick={() =>
            startTransition(async () => {
              const res = await importEntries(
                importable.map((e) => ({ date: e.date, body: e.body })),
                mode,
              );
              if (res.ok) {
                setResult({
                  ok: true,
                  text: `Imported ${res.imported} ${res.imported === 1 ? "entry" : "entries"} from ${year}${res.skipped ? `, kept ${res.skipped} already in Prevail` : ""}.`,
                });
                setText("");
              } else setResult({ ok: false, text: res.error });
            })
          }
        >
          {pending ? "Importing…" : count === 0 ? "Nothing new to import" : `Import ${count} ${count === 1 ? "entry" : "entries"}`}
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
