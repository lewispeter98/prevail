import Link from "next/link";
import { db } from "@/lib/db";
import { listEntries } from "@/lib/journal";
import { NotesImport } from "./NotesImport";

export const metadata = { title: "Journal settings" };

export default async function JournalSettings() {
  const entries = await listEntries(await db());
  return (
    <>
      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Import from iOS Notes</h2>
        <p className="mt-1 text-[13px] text-muted">
          Open one year&apos;s note, select all the text, copy it and paste it below. Each date heading, like
          “24th Sept”, starts a new entry. Do one note (one year) at a time.
        </p>
        <NotesImport existing={entries.map((e) => e.date)} />
      </section>

      <section className="card">
        <h2 className="font-serif text-[26px] leading-tight font-semibold">Export</h2>
        <p className="mt-1 text-[13px] text-muted">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}, with feelings and reflections.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href="/journal/export?format=md" download className="btn btn-ghost text-center">
            Markdown
          </a>
          <a href="/journal/export?format=json" download className="btn btn-ghost text-center">
            Full backup (JSON)
          </a>
        </div>
      </section>

      <Link href="/journal" className="link self-center py-2">
        Back to today
      </Link>
    </>
  );
}
