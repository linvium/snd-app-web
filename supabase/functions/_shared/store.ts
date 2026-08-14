import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import type { KycVerificationRecord } from './types.ts'

type KycRow = {
  user_id: string
  provider: string
  provider_session_id: string | null
  status: KycVerificationRecord['status']
  verified_at: string | null
  rejected_reason: string | null
  expires_at: string | null
  updated_at: string
}

export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase admin env is not set')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function rowToRecord(row: KycRow): KycVerificationRecord {
  return {
    userId: row.user_id,
    sessionId: row.provider_session_id,
    provider: row.provider,
    status: row.status,
    verifiedAt: row.verified_at,
    rejectedReason: row.rejected_reason,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  }
}

export async function upsertVerification(
  admin: SupabaseClient,
  v: KycVerificationRecord
): Promise<void> {
  const { error } = await admin.from('kyc_verifications').upsert(
    {
      user_id: v.userId,
      provider: v.provider,
      provider_session_id: v.sessionId,
      status: v.status,
      verified_at: v.verifiedAt,
      rejected_reason: v.rejectedReason,
      expires_at: v.expiresAt,
      updated_at: v.updatedAt,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

export async function getVerificationByUserId(
  admin: SupabaseClient,
  userId: string
): Promise<KycVerificationRecord | null> {
  const { data, error } = await admin
    .from('kyc_verifications')
    .select(
      'user_id, provider, provider_session_id, status, verified_at, rejected_reason, expires_at, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? rowToRecord(data as KycRow) : null
}

export async function getVerificationBySessionId(
  admin: SupabaseClient,
  sessionId: string
): Promise<KycVerificationRecord | null> {
  const { data, error } = await admin
    .from('kyc_verifications')
    .select(
      'user_id, provider, provider_session_id, status, verified_at, rejected_reason, expires_at, updated_at'
    )
    .eq('provider_session_id', sessionId)
    .maybeSingle()
  if (error) throw error
  return data ? rowToRecord(data as KycRow) : null
}

/** Returns false if event_id was already seen. */
export async function recordWebhookEvent(admin: SupabaseClient, eventId: string): Promise<boolean> {
  const { error } = await admin.from('kyc_webhook_events').insert({ event_id: eventId })
  if (error) {
    if (error.code === '23505') return false
    throw error
  }
  return true
}
