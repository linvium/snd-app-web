import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { REVIEW_REPORT_REASONS, type ReviewReportReason } from '@/types/listing-detail'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_DETAILS = 1000

/**
 * POST /api/v1/reviews/<id>/report — the "Prijavi" link beside each review
 * (doc 04 §11.2).
 *
 * Reporting twice is not twice the signal, so a repeat from the same person
 * answers 200 rather than an error: the reporter has no use for the distinction
 * and telling them apart only invites retrying.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Recenzija nije pronađena.')
  }

  // Email verification is not required to report something abusive — the bar to
  // flagging harm should be low.
  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  let body: { reason?: unknown; details?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return apiError(400, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  const reason = body.reason as ReviewReportReason
  if (!REVIEW_REPORT_REASONS.includes(reason)) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Izaberi razlog prijave.', {
      reason: 'Izaberi razlog prijave.',
    })
  }

  const details = typeof body.details === 'string' ? body.details.trim().slice(0, MAX_DETAILS) : null

  const { data: review } = await auth.supabase
    .from('reviews')
    .select('id, author_id')
    .eq('id', id)
    .maybeSingle()

  if (!review) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Recenzija nije pronađena.')
  }

  if (review.author_id === auth.userId) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Ne možeš prijaviti sopstvenu recenziju.')
  }

  const { error } = await auth.supabase.from('review_reports').upsert(
    {
      review_id: id,
      reporter_id: auth.userId,
      reason,
      details: details || null,
    },
    { onConflict: 'review_id,reporter_id', ignoreDuplicates: true }
  )

  if (error) {
    console.error('[review-report] insert failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.')
  }

  return apiOk({ review_id: id, status: 'submitted' })
}
