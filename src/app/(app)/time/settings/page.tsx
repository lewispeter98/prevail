import Link from "next/link";
import { db } from "@/lib/db";
import { getCategories, getQuickLabels, getRules } from "@/lib/time";
import { uncategorisedLabels } from "../actions";
import { CategoriesEditor, QuickEditor, RulesEditor, SortList } from "./Editors";
import { TimeImport } from "./TimeImport";

export const metadata = { title: "Time settings" };

export default async function TimeSettings() {
  const client = await db();
  const [categories, rules, quick, unsorted] = await Promise.all([
    getCategories(client),
    getRules(client),
    getQuickLabels(client),
    uncategorisedLabels(),
  ]);
  return (
    <>
      <section className="card scroll-mt-4" id="sort">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Sort activities</h2>
        <p className="mt-1 text-[13px] text-muted">
          {unsorted.length
            ? "These activities don't match a category yet. Pick one for each and Prevail will remember it."
            : "Everything you've logged has a category."}
        </p>
        {unsorted.length > 0 && <SortList items={unsorted} categories={categories} />}
      </section>

      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Categories</h2>
        <p className="mt-1 text-[13px] text-muted">Tap a colour to change it. Deleting a category leaves its entries uncategorised.</p>
        <CategoriesEditor categories={categories} />
      </section>

      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Matching rules</h2>
        <p className="mt-1 text-[13px] text-muted">
          Your words stay as you type them. These rules decide the category, checked top to bottom, like a bank app
          sorting transactions. Rules you create from an entry go to the top.
        </p>
        <RulesEditor rules={rules} categories={categories} />
      </section>

      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Quick buttons</h2>
        <p className="mt-1 text-[13px] text-muted">These stay in the same place on the Now tab.</p>
        <QuickEditor quick={quick} />
      </section>

      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Import from iOS Notes</h2>
        <TimeImport categories={categories} rules={rules} />
      </section>

      <Link href="/time" className="link self-center py-2">
        Back to now
      </Link>
    </>
  );
}
