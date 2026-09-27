import { getGoalWeight, getWeights } from "@/lib/weight";
import { withMovingAverage } from "@/lib/weightStats";
import { today } from "@/lib/day";
import { WeightChart } from "./WeightChart";
import { EntryList } from "./EntryList";

export const metadata = { title: "History" };

export default async function WeightHistory() {
  const [entries, goal] = await Promise.all([getWeights(), getGoalWeight()]);
  if (entries.length === 0) {
    return (
      <section className="card">
        <div className="label">History</div>
        <p className="mt-2 text-sm text-muted">
          Nothing logged yet. Log today&apos;s weight, or import your Google Sheet from settings.
        </p>
      </section>
    );
  }
  return (
    <>
      <WeightChart points={withMovingAverage(entries)} goal={goal} today={today()} />
      <EntryList entries={[...entries].reverse()} />
    </>
  );
}
