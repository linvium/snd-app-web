import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const COOKIE_NAME = "demo_user_id";

/**
 * Demo-only stand-in for real auth: pins a random user id to a cookie on
 * first visit so vendor_data stays stable across a session. Swap for real
 * session lookup (e.g. Supabase Auth) when auth is wired up.
 */
export async function getCurrentUserId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = `demo-${randomUUID()}`;
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}
