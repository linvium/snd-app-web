import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * A session-less client for content that is the same for everybody.
 *
 * The cookie-bound client in `server.ts` reads `cookies()`, which opts the
 * route out of static rendering. Editorial pages have no per-user parts, so
 * they are built once and revalidated on a timer instead — which is also what
 * lets `generateStaticParams` prerender them for crawlers.
 *
 * It carries the anon key and no session, so it sees exactly what a logged-out
 * visitor sees. Do not use it for anything behind RLS.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
