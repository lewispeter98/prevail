import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { WeeklyReview } from "./journal";

export const MODEL = "claude-opus-5";

// If a request is ever declined, the API retries it on Anthropic's
// recommended fallback model inside the same call.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  client ??= new Anthropic();
  return client;
}

const DAILY_SYSTEM = `You write the short reflection that appears under each day's entry in Prevail, a private journal app used by one person.

Read the entry and reply with one or two sentences, under 45 words in total. Speak directly to the writer as "you". Notice something specific they did, felt or chose today, and leave them with genuine encouragement. If the day was hard, acknowledge that honestly first, without sugar-coating it.

Write in plain British English, like a perceptive friend rather than a coach. Don't give advice or lists, don't ask questions, don't quote more than a few words of the entry, and avoid clichés such as "journey", "remember to be kind to yourself" or "every step counts". No emoji. If life goals are listed and one clearly connects to the day, you may nod to it; otherwise leave them out.

Reply with the reflection only.`;

const WEEKLY_SYSTEM = `You write the weekly review in Prevail, a private app one person uses to journal, track their weight and write out their goals every day.

You'll be given their week: daily journal entries with the feelings they picked, weight data, how many days they wrote out their goals, their life goals, and this month's three objectives with which are achieved. Write a review that plays the week back to them honestly and ties it to what they said matters.

Speak to them as "you", in plain British English, like a sharp, warm mentor who has read every word. Be specific: name days, numbers and things they actually wrote. Never invent events, figures or feelings that aren't in the data. If data is missing (for example no weigh-ins), say so briefly rather than guessing.

Fields:
- headline: one short line (under 10 words) that sums up the week.
- progress: 2–4 sentences on where they moved forward, especially against their objectives and life goals.
- drift: 2–3 sentences on where they slipped or lost focus, said kindly but plainly. If nothing slipped, say what came closest.
- focus: 2–3 sentences on what to concentrate on next week, concrete enough to act on.
- affirmation: one or two sentences of encouragement grounded in something real from the week.`;

const WeeklySchema = z.object({
  headline: z.string(),
  progress: z.string(),
  drift: z.string(),
  focus: z.string(),
  affirmation: z.string(),
});

export class ReflectionError extends Error {}

function describeError(err: unknown): never {
  if (err instanceof Anthropic.AuthenticationError) throw new ReflectionError("The Anthropic API key isn't valid.");
  if (err instanceof Anthropic.RateLimitError) throw new ReflectionError("Claude is busy right now. Try again in a minute.");
  if (err instanceof Anthropic.APIConnectionError) throw new ReflectionError("Couldn't reach Claude. Check your connection.");
  if (err instanceof Anthropic.APIError) throw new ReflectionError(`Claude returned an error (${err.status}).`);
  throw err;
}

export async function writeDailyReflection(input: {
  dateLabel: string;
  feelings: string[];
  body: string;
  lifeGoals: string[];
}): Promise<string> {
  const lines = [
    `Date: ${input.dateLabel}`,
    `Feelings picked: ${input.feelings.length ? input.feelings.join(", ") : "none"}`,
    "",
    "Entry:",
    input.body.trim() || "(No written entry, only feelings.)",
  ];
  if (input.lifeGoals.length) lines.push("", "Their life goals:", ...input.lifeGoals.map((g) => `- ${g}`));

  try {
    const response = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: DAILY_SYSTEM,
      messages: [{ role: "user", content: lines.join("\n") }],
      ...FALLBACK,
    });
    if (response.stop_reason === "refusal") throw new ReflectionError("Claude couldn't write a reflection for this entry.");
    const text = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    if (!text) throw new ReflectionError("Claude returned an empty reflection.");
    return text;
  } catch (err) {
    if (err instanceof ReflectionError) throw err;
    describeError(err);
  }
}

export async function writeWeeklyReview(weekContext: string): Promise<WeeklyReview> {
  try {
    const response = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: betaZodOutputFormat(WeeklySchema) },
      system: WEEKLY_SYSTEM,
      messages: [{ role: "user", content: weekContext }],
      ...FALLBACK,
    });
    if (response.stop_reason === "refusal") throw new ReflectionError("Claude couldn't write this week's review.");
    if (!response.parsed_output) throw new ReflectionError("Claude's review came back in an unexpected shape.");
    return response.parsed_output;
  } catch (err) {
    if (err instanceof ReflectionError) throw err;
    describeError(err);
  }
}
