import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SESSION_COOKIE, isValidSession } from "./session";

let client: SupabaseClient | null = null;

/**
 * Every database call goes through here. It re-checks the passcode session
 * (the proxy is only the first line of defence) and uses the secret key,
 * which never leaves the server.
 */
export async function db(): Promise<SupabaseClient> {
  const store = await cookies();
  if (!isValidSession(store.get(SESSION_COOKIE)?.value)) {
    throw new Error("Not unlocked");
  }
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
