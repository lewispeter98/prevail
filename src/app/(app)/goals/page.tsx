import Link from "next/link";
import { db } from "@/lib/db";
import { today } from "@/lib/day";
import { getActiveGoals, getScript } from "@/lib/goals";
import { ScriptBoard } from "./ScriptBoard";

export default async function GoalsScript() {
  const client = await db();
  const date = today();
  const [goals, script] = await Promise.all([getActiveGoals(client), getScript(client, date)]);

  if (goals.length === 0) {
    return (
      <section className="card">
        <div className="label">Your life goals</div>
        <p className="mt-2 font-serif text-xl leading-snug italic text-muted">
          Write down the big goals you want to live by. You&apos;ll write them out here every day.
        </p>
        <Link href="/goals/settings" className="btn mt-4 text-center">
          Add your goals
        </Link>
      </section>
    );
  }

  return <ScriptBoard key={date} date={date} goals={goals.map((g) => g.text)} done={script != null} />;
}
