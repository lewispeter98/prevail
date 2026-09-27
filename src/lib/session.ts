import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "prevail_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // one year

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * The session token is derived from the passcode, so changing
 * PREVAIL_PASSCODE signs every device out.
 */
export function sessionToken(): string {
  return createHmac("sha256", env("SESSION_SECRET"))
    .update(`prevail:${env("PREVAIL_PASSCODE")}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  return safeEqual(token, sessionToken());
}

export function isCorrectPasscode(input: string): boolean {
  return safeEqual(input.trim(), env("PREVAIL_PASSCODE"));
}
