export type ParsedNoteEntry = { date: string; body: string; heading: string };

export type ParsedNote = {
  entries: ParsedNoteEntry[];
  /** Headings that looked like dates but aren't real days (e.g. "31st Sept"). */
  invalid: string[];
  /** Text before the first date heading, which has nowhere to go. */
  preamble: string;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAY = "(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\\s+";

// "16th September", "21st Sept", "3 Sep", "Monday 16th September", "16th of September"
const DAY_FIRST = new RegExp(`^\\s*(?:${WEEKDAY})?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?([a-z]{3,9})\\.?\\s*:?\\s*$`, "i");
// "September 16th", "Sept 21", "Monday, September 16"
const MONTH_FIRST = new RegExp(`^\\s*(?:${WEEKDAY})?([a-z]{3,9})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*:?\\s*$`, "i");

function monthIndex(word: string): number {
  const w = word.toLowerCase();
  const i = MONTHS.indexOf(w.slice(0, 3));
  // Guard against ordinary words that happen to start like a month ("marvellous 3").
  if (i < 0) return -1;
  const full = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"][i];
  return full.startsWith(w) || w === "sept" ? i : -1;
}

function heading(line: string): { month: number; day: number } | null {
  let m = line.match(DAY_FIRST);
  if (m) {
    const month = monthIndex(m[2]);
    return month < 0 ? null : { month, day: +m[1] };
  }
  m = line.match(MONTH_FIRST);
  if (m) {
    const month = monthIndex(m[1]);
    return month < 0 ? null : { month, day: +m[2] };
  }
  return null;
}

function toKey(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Splits one year's Apple Notes journal into entries. Each date heading starts a new
 * entry and the lines under it are its text. Two headings for the same day are joined.
 */
export function parseNote(text: string, year: number): ParsedNote {
  const byDate = new Map<string, ParsedNoteEntry>();
  const invalid: string[] = [];
  const preamble: string[] = [];
  let current: { date: string | null; heading: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current?.date) return;
    const body = current.lines.join("\n").trim();
    const existing = byDate.get(current.date);
    if (existing) existing.body = [existing.body, body].filter(Boolean).join("\n\n");
    else byDate.set(current.date, { date: current.date, body, heading: current.heading });
  };

  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const h = heading(line);
    if (h) {
      flush();
      const date = toKey(year, h.month, h.day);
      if (!date) invalid.push(line.trim());
      current = { date, heading: line.trim(), lines: [] };
    } else if (current) current.lines.push(line);
    else preamble.push(line);
  }
  flush();

  return {
    entries: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
    invalid,
    preamble: preamble.join("\n").trim(),
  };
}
