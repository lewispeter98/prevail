import { addDays, toDate, type DayKey } from "./day";

export type ParsedTimeDay = { date: DayKey; heading: string; items: { hm: string; label: string }[] };

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Reads a time-tracking note: day-name headings ("Sunday") followed by lines
 * like "07:30 wake up". Newest day first. `firstDate` is the date of the top
 * heading; each later heading is the most recent earlier day with that name.
 */
export function parseTimeNote(text: string, firstDate: DayKey): { days: ParsedTimeDay[]; skipped: string[] } {
  const days: ParsedTimeDay[] = [];
  const skipped: string[] = [];
  let anchor = firstDate;
  let cur: ParsedTimeDay | null = null;

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const w = WEEKDAYS.findIndex((d) => line.toLowerCase().replace(/[:.]$/, "") === d || line.toLowerCase().startsWith(d + " "));
    if (w >= 0 && !/^\d/.test(line)) {
      let d = days.length ? addDays(anchor, -1) : anchor;
      for (let i = 0; i < 7 && toDate(d).getUTCDay() !== w; i++) d = addDays(d, -1);
      anchor = d;
      cur = { date: d, heading: line, items: [] };
      days.push(cur);
      continue;
    }
    const m = line.match(/^(\d{1,2})[:.](\d{2})\s*[-–—]?\s*(.+)$/);
    if (m && cur && +m[1] < 24 && +m[2] < 60) {
      cur.items.push({ hm: `${m[1].padStart(2, "0")}:${m[2]}`, label: m[3].trim() });
    } else if (days.length) skipped.push(line);
  }
  return { days: days.filter((d) => d.items.length), skipped };
}
