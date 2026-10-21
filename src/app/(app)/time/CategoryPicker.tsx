"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/Sheet";
import { SWATCHES, type TimeCategory } from "@/lib/timeCore";
import { createCategory, setEntryCategory } from "./actions";

/** Name + colour form for a new category. Calls back with the new category's id. */
export function NewCategoryForm({
  categories,
  onCreated,
}: {
  categories: TimeCategory[];
  onCreated: (id: string, name: string) => void;
}) {
  const router = useRouter();
  const used = new Set(categories.map((c) => c.colour));
  const [name, setName] = useState("");
  const [colour, setColour] = useState(SWATCHES.find((c) => !used.has(c)) ?? SWATCHES[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      const res = await createCategory(name, colour);
      if (res.ok) {
        router.refresh();
        onCreated(res.id, name.trim());
      }
      else setError(res.error);
    });

  return (
    <div className="mt-2.5 rounded-2xl border border-line bg-surface p-3.5">
      <label htmlFor="new-cat-name" className="label">
        New category
      </label>
      <input
        id="new-cat-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())}
        placeholder="e.g. Health"
        className="field mt-1.5"
        autoComplete="off"
      />
      <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Colour">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            aria-pressed={colour === c}
            onClick={() => setColour(c)}
            className={`size-7 rounded-full border-2 ${colour === c ? "border-ink" : "border-transparent"}`}
            style={{ background: c, boxShadow: colour === c ? "inset 0 0 0 2px var(--surface)" : undefined }}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
      <button type="button" className="btn mt-3" disabled={pending || !name.trim()} onClick={create}>
        {pending ? "Creating…" : "Create category"}
      </button>
    </div>
  );
}

/**
 * Choose an entry's category, Monzo-style: either always for entries containing
 * some words (saved as a rule, which also recategorises the past), or just this one.
 */
export function CategoryPicker({
  entry,
  current,
  categories,
  onClose,
}: {
  entry: { id: string; label: string; when: string };
  current: string | null;
  categories: TimeCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(current);
  const [extra, setExtra] = useState<TimeCategory[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [scope, setScope] = useState<"all" | "one">("all");
  const [keyword, setKeyword] = useState(entry.label.toLowerCase());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const all = [...categories, ...extra.filter((x) => !categories.some((c) => c.id === x.id))];
  const pickedName = all.find((c) => c.id === picked)?.name;

  const save = () =>
    startTransition(async () => {
      if (!picked) return;
      const res = await setEntryCategory(entry.id, picked, scope, keyword);
      if (res.ok) {
        router.refresh();
        onClose();
      }
      else setError(res.error);
    });

  return (
    <Sheet onClose={onClose} label={`Category for ${entry.label}`}>
      <h2 className="font-serif text-[28px] leading-tight font-semibold break-words">{entry.label}</h2>
      <p className="text-[13px] text-muted">{entry.when}</p>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        {all.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={picked === c.id}
            onClick={() => {
              setPicked(c.id);
              setShowNew(false);
            }}
            className={`flex items-center gap-2.5 rounded-xl border bg-surface p-3 text-left ${
              picked === c.id ? "border-ink shadow-[inset_0_0_0_1px_var(--ink)]" : "border-line"
            }`}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.colour }} />
            <span className="min-w-0 truncate">{c.name}</span>
          </button>
        ))}
        <button
          type="button"
          aria-expanded={showNew}
          onClick={() => setShowNew((s) => !s)}
          className="rounded-xl border border-dashed border-line p-3 text-left font-semibold text-green-ink"
        >
          ＋ New category
        </button>
      </div>

      {showNew && (
        <NewCategoryForm
          categories={all}
          onCreated={(id, name) => {
            setExtra((x) => [...x, { id, name, colour: "" }]);
            setPicked(id);
            setShowNew(false);
          }}
        />
      )}

      {picked && !showNew && (
        <>
          <div className="mt-3">
            <label className="flex items-start gap-2.5 border-b border-line py-3">
              <input
                type="radio"
                name="scope"
                checked={scope === "all"}
                onChange={() => setScope("all")}
                className="mt-1 accent-green"
              />
              <span>
                Always put entries containing{" "}
                <input
                  aria-label="Words to match"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={() => setScope("all")}
                  className="mx-1 w-36 rounded-lg border border-line bg-surface px-2 py-0.5"
                />{" "}
                in <b>{pickedName}</b>
                <span className="block text-[13px] text-muted">Past and future entries update to match.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 border-b border-line py-3">
              <input
                type="radio"
                name="scope"
                checked={scope === "one"}
                onChange={() => setScope("one")}
                className="mt-1 accent-green"
              />
              <span>Just this entry</span>
            </label>
          </div>
          {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
          <button type="button" className="btn mt-3.5" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </button>
        </>
      )}
    </Sheet>
  );
}
