import { db } from "@/lib/db";
import { today } from "@/lib/day";
import { getEntry, getReflection } from "@/lib/journal";
import { JournalEditor } from "./JournalEditor";

export const maxDuration = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function JournalToday({ searchParams }: PageProps<"/journal">) {
  const { date: param } = await searchParams;
  const now = today();
  const date = typeof param === "string" && DATE_RE.test(param) && param <= now ? param : now;

  const client = await db();
  const [entry, reflection] = await Promise.all([getEntry(client, date), getReflection(client, "daily", date)]);

  return (
    <JournalEditor
      key={date}
      date={date}
      today={now}
      initialFeelings={entry?.feelings ?? []}
      initialBody={entry?.body ?? ""}
      done={entry?.doneAt != null}
      reflection={reflection?.kind === "daily" ? reflection.content.text : null}
    />
  );
}
