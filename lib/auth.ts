import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Supabase client that carries the visitor's sign-in cookies, for server pages and API routes.
// Signed out, it behaves like the public read-only client.
export async function getUserClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { for (const { name, value, options } of list) store.set(name, value, options); } catch { /* read-only during page render */ }
      },
    },
  });
}

export async function getUser(): Promise<{ db: SupabaseClient; user: User } | null> {
  const db = await getUserClient();
  if (!db) return null;
  const { data } = await db.auth.getUser();
  return data.user ? { db, user: data.user } : null;
}

export const GOOGLE_SIGN_IN = process.env.GOOGLE_SIGN_IN === "1";

// Only allow redirects back into this site after signing in.
export function safeNext(next: string | null | undefined, fallback = "/account") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
