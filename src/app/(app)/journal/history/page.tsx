import { db } from "@/lib/db";
import { listEntries } from "@/lib/journal";
import { HistoryList } from "./HistoryList";

export const metadata = { title: "Journal history" };

export default async function JournalHistory() {
  const entries = await listEntries(await db());
  if (entries.length === 0) {
    return (
      <section className="card">
        <div className="label">History</div>
        <p className="mt-2 text-sm text-muted">
          No entries yet. Write today&apos;s, or import your Notes from the settings button at the top.
        </p>
      </section>
    );
  }
  return <HistoryList entries={entries} />;
}
