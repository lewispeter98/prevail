"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, isCorrectPasscode, sessionToken } from "@/lib/session";

export type UnlockState = { error?: string };

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function unlock(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const passcode = String(formData.get("passcode") ?? "");
  if (!isCorrectPasscode(passcode)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "That passcode isn't right. Try again." };
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(safeNext(formData.get("next")));
}
