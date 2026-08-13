import { createAdminClient } from '@/lib/supabase/admin'
import type { KycVerificationRecord } from '@/types/kyc'
import type { Database } from '@/types/supabase'

type KycRow = Database['public']['Tables']['kyc_verifications']['Row']

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

export const store = {
  async upsertVerification(v: KycVerificationRecord): Promise<void> {
    const { error } = await createAdminClient().from('kyc_verifications').upsert(
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
  },

  async getVerificationByUserId(userId: string): Promise<KycVerificationRecord | null> {
    const { data, error } = await createAdminClient()
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data ? rowToRecord(data) : null
  },

  async getVerificationBySessionId(sessionId: string): Promise<KycVerificationRecord | null> {
    const { data, error } = await createAdminClient()
      .from('kyc_verifications')
      .select('*')
      .eq('provider_session_id', sessionId)
      .maybeSingle()
    if (error) throw error
    return data ? rowToRecord(data) : null
  },

  /** Returns false (no-op) if event_id was already seen. */
  async recordWebhookEvent(eventId: string): Promise<boolean> {
    const { error } = await createAdminClient().from('kyc_webhook_events').insert({ event_id: eventId })
    if (error) {
      if (error.code === '23505') return false
      throw error
    }
    return true
  },

  async hasWebhookEvent(eventId: string): Promise<boolean> {
    const { data, error } = await createAdminClient()
      .from('kyc_webhook_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle()
    if (error) throw error
    return Boolean(data)
  },
}
