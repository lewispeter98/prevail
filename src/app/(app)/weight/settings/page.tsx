import Link from "next/link";
import { getGoalWeight, getWeights } from "@/lib/weight";
import { fmtKg } from "@/lib/weightStats";
import { GoalForm } from "./GoalForm";
import { ImportCsv } from "./ImportCsv";

export const metadata = { title: "Weight settings" };

export default async function WeightSettings() {
  const [goal, entries] = await Promise.all([getGoalWeight(), getWeights()]);
  return (
    <>
      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Goal weight</h2>
        <p className="mt-1 text-[13px] text-muted">Shown on Today and as a line on your graph.</p>
        <GoalForm initial={goal != null ? fmtKg(goal) : ""} />
      </section>

      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Import from Google Sheets</h2>
        <p className="mt-1 text-[13px] text-muted">
          In your sheet, choose File → Download → Comma-separated values (.csv), then pick that file here. It needs a
          date column and a weight column in kg.
        </p>
        <ImportCsv existing={entries.map((e) => e.date)} />
      </section>

      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Export</h2>
        <p className="mt-1 text-[13px] text-muted">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} as a CSV file.
        </p>
        <a href="/weight/export" download className="btn btn-ghost mt-4 text-center">
          Download CSV
        </a>
      </section>

      <Link href="/weight" className="link self-center py-2">
        Back to today
      </Link>
    </>
  );
}
