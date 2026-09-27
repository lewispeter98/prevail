import { db } from "@/lib/db";
import { formatDay, today } from "@/lib/day";
import { getObjectives } from "@/lib/goals";
import { monthName, monthWindow, openMonths } from "@/lib/months";
import { MonthObjectives } from "./MonthObjectives";

export const metadata = { title: "Objectives" };

const dm = (d: string) => formatDay(d, { day: "numeric", month: "short" });

export default async function Objectives() {
  const day = today();
  const w = monthWindow(day);
  const objectives = await getObjectives(await db(), openMonths(day));
  const forMonth = (m: string) => objectives.filter((o) => o.month === m);

  return (
    <>
      <MonthObjectives
        key={w.current}
        month={w.current}
        title={`${monthName(w.current)} objectives`}
        note={`${w.daysLeft === 0 ? "Last day" : `${w.daysLeft} day${w.daysLeft === 1 ? "" : "s"} left`} this month.`}
        objectives={forMonth(w.current)}
        canTick
      />

      {w.grace && (
        <MonthObjectives
          key={w.grace}
          month={w.grace}
          title={`${monthName(w.grace)} · closing`}
          note={`You can still tick these off until ${dm(w.graceEnds!)}. After that the month's score is final.`}
          objectives={forMonth(w.grace)}
          canTick
        />
      )}

      {w.planning && (
        <MonthObjectives
          key={w.planning}
          month={w.planning}
          title={`Plan ${monthName(w.planning)}`}
          note={`Three things that would make ${monthName(w.planning)} a success.`}
          objectives={forMonth(w.planning)}
          canTick={false}
        />
      )}
    </>
  );
}
