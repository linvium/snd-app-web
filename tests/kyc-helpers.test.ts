import { describe, expect, it } from 'vitest'
import {
  isUserIdVendorData,
  mapDiditStatus,
  shouldApplyMappedStatus,
  isTerminalKycStatus,
} from '@/lib/kyc/kyc.helpers'
import type { SessionStatus } from '@/types/didit'

const NOW = '2026-08-13T10:00:00.000Z'

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

describe('mapDiditStatus', () => {
  it('maps every Didit status without throwing', () => {
    for (const status of ALL_STATUSES) {
      expect(() => mapDiditStatus(status, NOW)).not.toThrow()
    }
  })

  it('maps Approved to verified with verifiedAt', () => {
    expect(mapDiditStatus('Approved', NOW)).toEqual({
      status: 'verified',
      verifiedAt: NOW,
      rejectedReason: null,
    })
  })

  it('maps Declined to rejected', () => {
    expect(mapDiditStatus('Declined', NOW)).toEqual({
      status: 'rejected',
      verifiedAt: null,
      rejectedReason: 'Declined',
    })
  })

  it('maps expiry-like statuses to expired', () => {
    expect(mapDiditStatus('Expired', NOW)?.status).toBe('expired')
    expect(mapDiditStatus('Abandoned', NOW)?.status).toBe('expired')
    expect(mapDiditStatus('Kyc Expired', NOW)?.status).toBe('expired')
  })

  it('maps in-flight statuses to in_progress', () => {
    expect(mapDiditStatus('In Progress', NOW)?.status).toBe('in_progress')
    expect(mapDiditStatus('Not Started', NOW)?.status).toBe('in_progress')
    expect(mapDiditStatus('In Review', NOW)?.status).toBe('in_progress')
    expect(mapDiditStatus('Resubmitted', NOW)?.status).toBe('in_progress')
  })

  it('treats Awaiting User as a no-op', () => {
    expect(mapDiditStatus('Awaiting User', NOW)).toBeNull()
  })
})

describe('shouldApplyMappedStatus', () => {
  it('does not regress verified to in_progress', () => {
    expect(shouldApplyMappedStatus('verified', 'in_progress')).toBe(false)
  })

  it('allows Kyc Expired to move verified to expired', () => {
    expect(shouldApplyMappedStatus('verified', 'expired')).toBe(true)
  })

  it('allows first write and other transitions', () => {
    expect(shouldApplyMappedStatus(null, 'in_progress')).toBe(true)
    expect(shouldApplyMappedStatus('in_progress', 'verified')).toBe(true)
    expect(shouldApplyMappedStatus('rejected', 'in_progress')).toBe(true)
  })
})

describe('isTerminalKycStatus', () => {
  it('treats verified, rejected, and expired as terminal', () => {
    expect(isTerminalKycStatus('verified')).toBe(true)
    expect(isTerminalKycStatus('rejected')).toBe(true)
    expect(isTerminalKycStatus('expired')).toBe(true)
    expect(isTerminalKycStatus('in_progress')).toBe(false)
    expect(isTerminalKycStatus('not_started')).toBe(false)
  })
})

describe('isUserIdVendorData', () => {
  it('accepts a UUID and rejects demo-style ids', () => {
    expect(isUserIdVendorData('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isUserIdVendorData('demo-abc')).toBe(false)
    expect(isUserIdVendorData(undefined)).toBe(false)
  })
})
