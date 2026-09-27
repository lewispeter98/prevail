import { parseKg } from "./weightStats";

export type ParsedWeights = {
  rows: { date: string; kg: number }[];
  /** Lines that looked like data but couldn't be read. */
  skipped: string[];
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "," || ch === ";" || ch === "\t")) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

function valid(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Reads a date cell. Numeric dates are day-first (UK) unless `monthFirst` is set.
 * Handles 27/09/2026, 27-09-26, 2026-09-27, 27 Sep 2026 and Sep 27, 2026.
 */
function parseDate(cell: string, monthFirst: boolean): string | null {
  const s = cell.trim().replace(/\s+/g, " ");
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    return monthFirst ? valid(fullYear(+m[3]), a, b) : valid(fullYear(+m[3]), b, a);
  }
  m = s.match(/^(?:[a-z]+,? )?(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)\.?,? (\d{2,4})$/i);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    return mi < 0 ? null : valid(fullYear(+m[3]), mi + 1, +m[1]);
  }
  m = s.match(/^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{2,4})$/i);
  if (m) {
    const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return mi < 0 ? null : valid(fullYear(+m[3]), mi + 1, +m[2]);
  }
  return null;
}

/** Parses a CSV exported from Google Sheets with a date column and a weight (kg) column. */
export function parseWeightCsv(text: string): ParsedWeights {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const cells = lines.map(splitLine);

  // If any numeric date has a middle part above 12, the file is month-first (US).
  const monthFirst = cells.some((row) =>
    row.some((c) => {
      const m = c.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}$/);
      return m != null && +m[2] > 12;
    }),
  );

  const rows: ParsedWeights["rows"] = [];
  const skipped: string[] = [];
  cells.forEach((row, i) => {
    if (row.every((c) => !c)) return;
    const di = row.findIndex((c) => parseDate(c, monthFirst) != null);
    const date = di >= 0 ? parseDate(row[di], monthFirst) : null;
    const kg = row.map((c, j) => (j === di ? null : parseKg(c))).find((v) => v != null) ?? null;
    if (date && kg != null) rows.push({ date, kg });
    else if (i > 0 || date) skipped.push(lines[i]); // the first line is usually a header
  });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, skipped };
}
