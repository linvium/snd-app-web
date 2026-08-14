import { createClient } from '@/lib/supabase/client'
import type { KycDbStatus, KycVerificationRecord, StartKycResult } from '@/types/kyc'

function mapRow(row: {
  user_id: string
  provider: string
  provider_session_id: string | null
  status: string
  verified_at: string | null
  rejected_reason: string | null
  expires_at: string | null
  updated_at: string
}): KycVerificationRecord {
  return {
    userId: row.user_id,
    sessionId: row.provider_session_id,
    provider: row.provider,
    status: row.status as KycDbStatus,
    verifiedAt: row.verified_at,
    rejectedReason: row.rejected_reason,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  }
}

export const kycService = {
  getCurrent: async (): Promise<KycVerificationRecord | null> => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('kyc_verifications')
      .select(
        'user_id, provider, provider_session_id, status, verified_at, rejected_reason, expires_at, updated_at'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    return mapRow(data)
  },

  start: async (): Promise<StartKycResult> => {
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke<StartKycResult>('kyc-start', {
      method: 'POST',
    })

    if (error) {
      const status = (error as { context?: Response }).context?.status
      if (status === 401) {
        throw new Error('Nije prijavljen')
      }
      throw new Error('Ne mogu da pokrenem verifikaciju. Pokušaj ponovo.')
    }
    if (!data) {
      throw new Error('Ne mogu da pokrenem verifikaciju. Pokušaj ponovo.')
    }
    return data
  },
}
