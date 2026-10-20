import { db } from "@/lib/db";
import { addDays, requestTime } from "@/lib/day";
import { getCategories, getDailyTotals, getEntriesForDays, getRules } from "@/lib/time";
import { timeToday } from "@/lib/timeCore";
import { BreakdownView } from "./BreakdownView";

export const metadata = { title: "Breakdown" };

/** Days of entries sent with the page, so recent days open instantly. */
const RECENT_DAYS = 7;

export default async function Breakdown() {
  const client = await db();
  const end = timeToday();
  // Totals for this year (and at least the last three months) load up front.
  const back = addDays(end, -92);
  const from = `${end.slice(0, 4)}-01-01` < back ? `${end.slice(0, 4)}-01-01` : back;
  const recentFrom = addDays(end, -(RECENT_DAYS - 1));
  const [totals, entries, categories, rules] = await Promise.all([
    getDailyTotals(client, from, end),
    getEntriesForDays(client, recentFrom, end),
    getCategories(client),
    getRules(client),
  ]);
  return (
    <BreakdownView
      today={end}
      serverNow={requestTime()}
      totalsFrom={from}
      totals={totals}
      recentFrom={recentFrom}
      entries={entries}
      categories={categories}
      rules={rules}
    />
  );
}
