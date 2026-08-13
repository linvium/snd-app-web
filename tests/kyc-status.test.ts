import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DiditWebhookPayload, SessionStatus } from '@/types/didit'
import type { KycVerificationRecord } from '@/types/kyc'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const store = {
  upsertVerification: vi.fn(),
  getVerificationByUserId: vi.fn(),
  getVerificationBySessionId: vi.fn(),
  recordWebhookEvent: vi.fn(),
  hasWebhookEvent: vi.fn(),
}

vi.mock('@/lib/kyc/kyc.store', () => ({ store }))

const { applyDecision } = await import('@/lib/kyc/kyc.status')

const ALL_STATUSES: SessionStatus[] = [
  'Not Started',
  'In Progress',
  'Awaiting User',
  'In Review',
  'Approved',
  'Declined',
  'Resubmitted',
  'Abandoned',
  'Expired',
  'Kyc Expired',
]

function payloadFor(status: SessionStatus, sessionId: string): DiditWebhookPayload {
  return {
    event_id: `evt-${sessionId}`,
    webhook_type: 'status.updated',
    session_id: sessionId,
    status,
    vendor_data: USER_ID,
  }
}

describe('applyDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.getVerificationByUserId.mockResolvedValue(null)
    store.upsertVerification.mockResolvedValue(undefined)
  })

  it('has an explicit branch for all 10 statuses (none throw)', async () => {
    for (const status of ALL_STATUSES) {
      const sessionId = `sess-${status.replace(/\s/g, '')}`
      await expect(applyDecision(payloadFor(status, sessionId))).resolves.not.toThrow()
    }
  })

  it('marks Approved as verified', async () => {
    await applyDecision(payloadFor('Approved', 'sess-approved-check'))
    expect(store.upsertVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        sessionId: 'sess-approved-check',
        status: 'verified',
        verifiedAt: expect.any(String),
      })
    )
  })

  it('marks Kyc Expired as not verified', async () => {
    await applyDecision(payloadFor('Kyc Expired', 'sess-kycexpired-check'))
    expect(store.upsertVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'expired',
        verifiedAt: null,
      })
    )
  })

  it('Awaiting User is a no-op and does not write', async () => {
    await applyDecision(payloadFor('Awaiting User', 'sess-awaiting-check'))
    expect(store.upsertVerification).not.toHaveBeenCalled()
    expect(store.getVerificationByUserId).not.toHaveBeenCalled()
  })

  it('does not regress verified back to in_progress', async () => {
    const existing: KycVerificationRecord = {
      userId: USER_ID,
      sessionId: 'sess-verified',
      provider: 'didit',
      status: 'verified',
      verifiedAt: '2026-08-13T10:00:00.000Z',
      rejectedReason: null,
      expiresAt: null,
      updatedAt: '2026-08-13T10:00:00.000Z',
    }
    store.getVerificationByUserId.mockResolvedValue(existing)

    await applyDecision(payloadFor('In Progress', 'sess-later'))
    expect(store.upsertVerification).not.toHaveBeenCalled()
  })

  it('allows Kyc Expired to clear a verified row', async () => {
    const existing: KycVerificationRecord = {
      userId: USER_ID,
      sessionId: 'sess-verified',
      provider: 'didit',
      status: 'verified',
      verifiedAt: '2026-08-13T10:00:00.000Z',
      rejectedReason: null,
      expiresAt: null,
      updatedAt: '2026-08-13T10:00:00.000Z',
    }
    store.getVerificationByUserId.mockResolvedValue(existing)

    await applyDecision(payloadFor('Kyc Expired', 'sess-stale'))
    expect(store.upsertVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'expired',
        verifiedAt: null,
      })
    )
  })

  it('ignores non-UUID vendor_data', async () => {
    await applyDecision({
      event_id: 'evt-demo',
      webhook_type: 'status.updated',
      session_id: 'sess-demo',
      status: 'Approved',
      vendor_data: 'demo-user',
    })
    expect(store.upsertVerification).not.toHaveBeenCalled()
    expect(store.getVerificationByUserId).not.toHaveBeenCalled()
  })
})
