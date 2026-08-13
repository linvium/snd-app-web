import type { SessionStatus } from '@/types/didit'
import type { KycDbStatus } from '@/types/kyc'

const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUserIdVendorData(value: string | undefined | null): value is string {
  return typeof value === 'string' && USER_ID_RE.test(value)
}

export function getDiditEnvironment(): 'sandbox' | 'live' {
  return process.env.DIDIT_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
}

export type MappedKycStatus = {
  status: KycDbStatus
  verifiedAt: string | null
  rejectedReason: string | null
}

export function mapDiditStatus(status: SessionStatus, now: string): MappedKycStatus | null {
  switch (status) {
    case 'Approved':
      return { status: 'verified', verifiedAt: now, rejectedReason: null }
    case 'Declined':
      return { status: 'rejected', verifiedAt: null, rejectedReason: 'Declined' }
    case 'Expired':
    case 'Abandoned':
    case 'Kyc Expired':
      return { status: 'expired', verifiedAt: null, rejectedReason: null }
    case 'In Progress':
    case 'Not Started':
    case 'In Review':
    case 'Resubmitted':
      return { status: 'in_progress', verifiedAt: null, rejectedReason: null }
    case 'Awaiting User':
      return null
    default: {
      const _exhaustive: never = status
      throw new Error(`Unhandled KYC status: ${_exhaustive}`)
    }
  }
}

export function isTerminalKycStatus(status: KycDbStatus): boolean {
  return status === 'verified' || status === 'rejected' || status === 'expired'
}

/** Do not regress a verified row back to in_progress. Kyc Expired → expired is allowed. */
export function shouldApplyMappedStatus(
  existing: KycDbStatus | null | undefined,
  next: KycDbStatus
): boolean {
  if (existing === 'verified' && next === 'in_progress') return false
  return true
}

export function kycStatusLabel(status: KycDbStatus): string {
  switch (status) {
    case 'verified':
      return 'Identitet potvrđen'
    case 'rejected':
      return 'Verifikacija odbijena'
    case 'expired':
      return 'Verifikacija istekla'
    case 'in_progress':
      return 'Verifikacija u toku'
    case 'pending_payment':
      return 'Čeka se plaćanje'
    case 'not_started':
      return 'Nije započeto'
  }
}
