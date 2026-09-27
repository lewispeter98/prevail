import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, isValidSession } from "./session";

let client: SupabaseClient | null = null;

/**
 * The raw client, with no session check. Only for code that has already
 * authenticated some other way (the scheduled weekly review checks CRON_SECRET).
 */
export function adminDb(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SECRET_KEY?.trim();
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
    // Accept either the full project URL or just the project ref.
    const fullUrl = /^https?:\/\//.test(url) ? url : `https://${url}.supabase.co`;
    client = createClient(fullUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/**
 * Every request-time database call goes through here. It re-checks the passcode
 * session (the proxy is only the first line of defence) and uses the secret key,
 * which never leaves the server.
 */
export async function db(): Promise<SupabaseClient> {
  const store = await cookies();
  if (!isValidSession(store.get(SESSION_COOKIE)?.value)) {
    throw new Error("Not unlocked");
  }
  return adminDb();
}
