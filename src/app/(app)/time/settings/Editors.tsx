"use client";

import { useState, useTransition } from "react";
import { SWATCHES, type TimeCategory, type TimeRule } from "@/lib/timeCore";
import {
  addRule,
  deleteCategory,
  deleteRule,
  saveQuickLabels,
  saveRules,
  updateCategory,
  updateRule,
} from "../actions";
import { NewCategoryForm } from "../CategoryPicker";

const NEW = "__new";

/** A category dropdown with "＋ New category…" built in. */
export function CategorySelect({
  value,
  onChange,
  categories,
  emptyLabel,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  categories: TimeCategory[];
  emptyLabel?: string;
  label: string;
}) {
  const [creating, setCreating] = useState(false);
  const [extra, setExtra] = useState<TimeCategory[]>([]);
  const all = [...categories, ...extra.filter((x) => !categories.some((c) => c.id === x.id))];
  return (
    <div className="min-w-0">
      <select
        aria-label={label}
        value={creating ? NEW : value}
        onChange={(e) => {
          if (e.target.value === NEW) setCreating(true);
          else {
            setCreating(false);
            onChange(e.target.value);
          }
        }}
        className="w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-2"
      >
        {emptyLabel != null && <option value="">{emptyLabel}</option>}
        {all.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value={NEW}>＋ New category…</option>
      </select>
      {creating && (
        <NewCategoryForm
          categories={all}
          onCreated={(id, name) => {
            setExtra((x) => [...x, { id, name, colour: "" }]);
            setCreating(false);
            onChange(id);
          }}
        />
      )}
    </div>
  );
}

function Status({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role="status" className={`mt-2 text-[13px] ${msg.ok ? "text-green-ink" : "text-error"}`}>
      {msg.text}
    </p>
  );
}

/** Uncategorised activities, each with a category picker. Saving creates "always" rules. */
export function SortList({ items, categories }: { items: { label: string; count: number }[]; categories: TimeCategory[] }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const chosen = Object.entries(choice).filter(([, id]) => id);

  return (
    <div className="mt-3">
      {items.slice(0, 40).map((it) => (
        <div key={it.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start gap-2.5 border-b border-line py-2.5">
          <span className="min-w-0 pt-2 break-words">
            {it.label} <span className="text-[13px] text-muted">×{it.count}</span>
          </span>
          <CategorySelect
            label={`Category for ${it.label}`}
            value={choice[it.label] ?? ""}
            onChange={(id) => setChoice((c) => ({ ...c, [it.label]: id }))}
            categories={categories}
            emptyLabel="Leave uncategorised"
          />
        </div>
      ))}
      <button
        type="button"
        className="btn mt-3"
        disabled={pending || chosen.length === 0}
        onClick={() =>
          startTransition(async () => {
            const res = await saveRules(chosen.map(([keyword, categoryId]) => ({ keyword, categoryId })));
            if (res.ok) {
              setChoice({});
              setMsg({ ok: true, text: `Sorted ${res.saved} ${res.saved === 1 ? "activity" : "activities"}.` });
            } else setMsg({ ok: false, text: res.error });
          })
        }
      >
        {pending ? "Saving…" : chosen.length ? `Save ${chosen.length}` : "Pick categories above"}
      </button>
      <Status msg={msg} />
    </div>
  );
}

export function CategoriesEditor({ categories }: { categories: TimeCategory[] }) {
  const [adding, setAdding] = useState(false);
  const [colourFor, setColourFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? null : { ok: false, text: res.error ?? "Couldn't save that." });
    });

  return (
    <div className="mt-3">
      {categories.map((c) => (
        <div key={c.id} className="border-b border-line py-2">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
            <button
              type="button"
              aria-label={`Change colour of ${c.name}`}
              aria-expanded={colourFor === c.id}
              onClick={() => setColourFor(colourFor === c.id ? null : c.id)}
              className="size-6 rounded-full"
              style={{ background: c.colour }}
            />
            <input
              defaultValue={c.name}
              aria-label="Category name"
              onBlur={(e) => e.target.value.trim() !== c.name && run(() => updateCategory(c.id, { name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="min-w-0 rounded-lg border border-line bg-surface px-2.5 py-1.5"
            />
            {confirm === c.id ? (
              <span className="flex gap-2 text-[13px]">
                <button type="button" className="font-semibold text-error" onClick={() => run(() => deleteCategory(c.id))}>
                  Delete
                </button>
                <button type="button" className="text-muted" onClick={() => setConfirm(null)}>
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                aria-label={`Delete ${c.name}`}
                onClick={() => setConfirm(c.id)}
                className="size-8 rounded-full border border-line text-muted"
              >
                ×
              </button>
            )}
          </div>
          {colourFor === c.id && (
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Colour for ${c.name}`}>
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`Colour ${s}`}
                  aria-pressed={c.colour === s}
                  onClick={() => {
                    setColourFor(null);
                    run(() => updateCategory(c.id, { colour: s }));
                  }}
                  className={`size-7 rounded-full border-2 ${c.colour === s ? "border-ink" : "border-transparent"}`}
                  style={{ background: s }}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      {adding ? (
        <NewCategoryForm categories={categories} onCreated={() => setAdding(false)} />
      ) : (
        <button type="button" className="btn btn-ghost mt-3" onClick={() => setAdding(true)}>
          ＋ Add a category
        </button>
      )}
      <Status msg={msg} />
    </div>
  );
}

export function RulesEditor({ rules, categories }: { rules: TimeRule[]; categories: TimeCategory[] }) {
  const [kw, setKw] = useState("");
  const [cat, setCat] = useState(categories[0]?.id ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg(null);
        after?.();
      } else setMsg({ ok: false, text: res.error ?? "Couldn't save that." });
    });

  return (
    <div className="mt-3">
      {rules.map((r) => (
        <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line py-2 text-[13px]">
          <input
            defaultValue={r.keyword}
            aria-label="Words to match"
            onBlur={(e) => e.target.value.trim().toLowerCase() !== r.keyword && run(() => updateRule(r.id, { keyword: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5"
          />
          <span className="text-muted">→</span>
          <select
            aria-label={`Category for “${r.keyword}”`}
            value={r.categoryId}
            onChange={(e) => run(() => updateRule(r.id, { categoryId: e.target.value }))}
            className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label={`Delete rule “${r.keyword}”`}
            onClick={() => run(() => deleteRule(r.id))}
            className="size-7 rounded-full border border-line text-muted"
          >
            ×
          </button>
        </div>
      ))}
      <form
        className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (kw.trim() && cat) run(() => addRule(kw, cat), () => setKw(""));
        }}
      >
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="Contains…"
          aria-label="New rule: words to match"
          className="min-w-0 rounded-lg border border-line bg-surface px-2.5 py-2"
        />
        <CategorySelect label="New rule: category" value={cat} onChange={setCat} categories={categories} />
        <button type="submit" className="btn w-auto px-4 py-2" disabled={pending || !kw.trim()}>
          Add
        </button>
      </form>
      <Status msg={msg} />
    </div>
  );
}

export function QuickEditor({ quick }: { quick: string[] }) {
  const [list, setList] = useState(quick);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const save = (next: string[]) => {
    setList(next);
    startTransition(async () => {
      const res = await saveQuickLabels(next);
      setMsg(res.ok ? null : { ok: false, text: res.error });
    });
  };
  const move = (i: number, by: number) => {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    save(next);
  };

  return (
    <div className="mt-3">
      {list.map((q, i) => (
        <div key={q} className="flex items-center gap-2 border-b border-line py-2">
          <span className="min-w-0 flex-1 truncate">{q}</span>
          <button type="button" aria-label={`Move ${q} up`} disabled={i === 0} onClick={() => move(i, -1)} className="size-8 rounded-full border border-line text-muted disabled:opacity-30">
            ↑
          </button>
          <button type="button" aria-label={`Move ${q} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)} className="size-8 rounded-full border border-line text-muted disabled:opacity-30">
            ↓
          </button>
          <button type="button" aria-label={`Remove ${q}`} onClick={() => save(list.filter((x) => x !== q))} className="size-8 rounded-full border border-line text-muted">
            ×
          </button>
        </div>
      ))}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim().toLowerCase();
          if (v && !list.includes(v)) save([...list, v]);
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a quick button, e.g. gym"
          aria-label="New quick button"
          className="field min-w-0 flex-1 py-2"
        />
        <button type="submit" className="btn w-auto px-4 py-2" disabled={!text.trim()}>
          Add
        </button>
      </form>
      <p className="mt-2 text-[12.5px] text-muted">Eight fit on screen; up to twelve are kept.</p>
      <Status msg={msg} />
    </div>
  );
}
