import { createClient } from '@/lib/supabase/server'
import { apiError, ERROR_CODES } from '@/lib/api/response'

export async function requireUser(options: { emailVerified?: boolean } = { emailVerified: true }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false as const,
      response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.'),
    }
  }

  const { data: row } = await supabase
    .from('users')
    .select('email, email_verified_at')
    .eq('id', user.id)
    .maybeSingle()

  const emailVerified = Boolean(row?.email_verified_at)
  if (options.emailVerified !== false && !emailVerified) {
    return {
      ok: false as const,
      response: apiError(403, ERROR_CODES.FORBIDDEN, 'Moraš potvrditi email adresu pre objave.'),
    }
  }

  return {
    ok: true as const,
    supabase,
    userId: user.id,
    email: row?.email ?? user.email ?? '',
    emailVerified,
  }
}
