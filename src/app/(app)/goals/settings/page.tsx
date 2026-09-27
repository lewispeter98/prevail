import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveGoals } from "@/lib/goals";
import { GoalsEditor } from "./GoalsEditor";

export const metadata = { title: "Goals settings" };

export default async function GoalsSettings() {
  const goals = await getActiveGoals(await db());
  return (
    <>
      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Your life goals</h2>
        <p className="mt-1 text-[13px] text-muted">
          Write each one in the present tense, as if it&apos;s already true: “I have a million pounds in the bank.” You
          write these out every day on the Script tab.
        </p>
        <GoalsEditor initial={goals} />
      </section>

      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Export</h2>
        <p className="mt-1 text-[13px] text-muted">Life goals, monthly objectives and every day you scripted.</p>
        <a href="/goals/export" download className="btn btn-ghost mt-4 text-center">
          Download backup (JSON)
        </a>
      </section>

      <Link href="/goals" className="link self-center py-2">
        Back to script
      </Link>
    </>
  );
}
