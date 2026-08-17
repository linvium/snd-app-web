export type SessionStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Awaiting User'
  | 'In Review'
  | 'Approved'
  | 'Declined'
  | 'Resubmitted'
  | 'Abandoned'
  | 'Expired'
  | 'Kyc Expired'

export type KycDbStatus =
  | 'not_started'
  | 'pending_payment'
  | 'in_progress'
  | 'verified'
  | 'rejected'
  | 'expired'

export type KycVerificationRecord = {
  userId: string
  sessionId: string | null
  provider: string
  status: KycDbStatus
  verifiedAt: string | null
  rejectedReason: string | null
  expiresAt: string | null
  updatedAt: string
}

export type DiditWebhookPayload = {
  event_id: string
  webhook_type: string
  session_id: string
  status: SessionStatus
  vendor_data: string
  environment?: 'live' | 'sandbox'
  timestamp?: number
  decision?: Decision
  [key: string]: unknown
}

export type Decision = {
  session_id: string
  vendor_data: string
  status: SessionStatus
  environment?: 'live' | 'sandbox'
  [key: string]: unknown
}

export type CreateSessionResponse = {
  session_id: string
  session_token: string
  url: string
  vendor_data: string
  status: SessionStatus
}
