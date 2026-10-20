import { FreshOnShow } from "@/components/FreshOnShow";
import { db } from "@/lib/db";
import { requestTime } from "@/lib/day";
import { getCategories, getEntriesForDays, getQuickLabels, getRules } from "@/lib/time";
import { timeToday } from "@/lib/timeCore";
import { NowView } from "./NowView";

export default async function TimeNow() {
  const client = await db();
  const day = timeToday();
  const [entries, categories, rules, quick] = await Promise.all([
    getEntriesForDays(client, day, day),
    getCategories(client),
    getRules(client),
    getQuickLabels(client),
  ]);
  return (
    <>
      <FreshOnShow renderedAt={requestTime()} />
      <NowView
      day={day}
      serverNow={requestTime()}
      entries={entries}
      categories={categories}
      rules={rules}
      quick={quick}
      />
    </>
  );
}
