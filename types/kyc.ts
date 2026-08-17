export type KycDbStatus =
  | 'not_started'
  | 'pending_payment'
  | 'in_progress'
  | 'verified'
  | 'rejected'
  | 'expired'

export interface KycVerificationRecord {
  userId: string
  sessionId: string | null
  provider: string
  status: KycDbStatus
  verifiedAt: string | null
  rejectedReason: string | null
  expiresAt: string | null
  updatedAt: string
}

export type StartKycResult =
  | { alreadyVerified: true }
  | { alreadyVerified?: false; url: string; sessionId: string; status: string }
