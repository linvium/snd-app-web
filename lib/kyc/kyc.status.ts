import { store } from './kyc.store'
import { isUserIdVendorData, mapDiditStatus, shouldApplyMappedStatus } from './kyc.helpers'
import type { DiditWebhookPayload, Decision } from '@/types/didit'

const FEATURE_ARRAY_KEYS = [
  'id_verifications',
  'liveness_checks',
  'face_matches',
  'nfc_verifications',
  'aml_screenings',
  'ip_analyses',
  'poa_verifications',
] as const

function logWarnings(decision: Decision | undefined, sessionId: string): void {
  if (!decision) return
  for (const key of FEATURE_ARRAY_KEYS) {
    const arr = decision[key]
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      const warnings = (item as { warnings?: unknown[] }).warnings
      if (warnings && warnings.length > 0) {
        console.warn(`[kyc] session=${sessionId} ${key} node=${item.node_id} warnings:`, warnings)
      }
    }
  }
}

/**
 * Applies a webhook payload (or the equivalent /decision/ response) to
 * kyc_verifications. Every one of the 10 SessionStatus values has an explicit
 * branch — none may silently fall through to a default.
 */
export async function applyDecision(payload: DiditWebhookPayload): Promise<void> {
  const { status, session_id: sessionId, vendor_data: vendorData, decision } = payload
  if (!isUserIdVendorData(vendorData)) return
  const mapped = mapDiditStatus(status, new Date().toISOString())
  if (!mapped) return

  if (status === 'Declined') {
    logWarnings(decision, sessionId)
  }

  const existing = await store.getVerificationByUserId(vendorData)
  if (!shouldApplyMappedStatus(existing?.status, mapped.status)) return

  const now = new Date().toISOString()
  await store.upsertVerification({
    userId: vendorData,
    sessionId,
    provider: existing?.provider ?? 'didit',
    status: mapped.status,
    verifiedAt: mapped.verifiedAt,
    rejectedReason: mapped.rejectedReason,
    expiresAt: existing?.expiresAt ?? null,
    updatedAt: now,
  })
}
