/**
 * Matching rules for goal scripting: capitals and extra spaces don't matter,
 * letters and punctuation do. Curly quotes and dashes from phone keyboards
 * count the same as their plain versions.
 */
const EQUIV: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-",
  " ": " ",
};

export const canonChar = (c: string) => (EQUIV[c] ?? c).toLowerCase();

export const normalise = (s: string) =>
  [...s].map(canonChar).join("").replace(/\s+/g, " ").trim();

export const isWritten = (typed: string, goal: string) => normalise(typed) === normalise(goal);

export type ScriptChar = { char: string; state: "ghost" | "ok" | "wrong" };

/** Character-by-character overlay of what's been typed against the goal. */
export function overlay(goal: string, typed: string): ScriptChar[] {
  const g = [...goal];
  const t = [...typed];
  const out: ScriptChar[] = [];
  const isSpace = (c: string | undefined) => c != null && /\s/.test(c);
  let gi = 0;
  for (let ti = 0; ti < t.length; ti++) {
    const c = t[ti];
    // Extra spaces (leading or doubled) don't count, so they don't use up a goal character.
    if (isSpace(c) && !isSpace(g[gi]) && (ti === 0 || isSpace(t[ti - 1]))) {
      out.push({ char: c, state: "ok" });
      continue;
    }
    out.push({ char: c, state: gi < g.length && canonChar(c) === canonChar(g[gi]) ? "ok" : "wrong" });
    gi++;
  }
  for (; gi < g.length; gi++) out.push({ char: g[gi], state: "ghost" });
  return out;
}
