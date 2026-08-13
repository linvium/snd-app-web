import { NextRequest, NextResponse } from 'next/server'
import { getDiditEnvironment, isUserIdVendorData } from '@/lib/kyc/kyc.helpers'
import { applyDecision } from '@/lib/kyc/kyc.status'
import { store } from '@/lib/kyc/kyc.store'
import { verifyWebhook } from '@/lib/kyc/didit.webhook'
import type { DiditWebhookPayload } from '@/types/didit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET
  if (!secret) {
    console.error('DIDIT_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  const signature = req.headers.get('x-signature-v2')
  const timestamp = req.headers.get('x-timestamp')
  const rawBody = await req.text()

  if (!signature || !timestamp || !verifyWebhook(rawBody, signature, timestamp, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: DiditWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 401 })
  }

  const expectedEnv = getDiditEnvironment()
  if (payload.environment && payload.environment !== expectedEnv) {
    console.warn(
      `[kyc] skipped webhook: Didit environment=${payload.environment} expected=${expectedEnv}`
    )
    return NextResponse.json({ ok: true, skipped: 'environment mismatch' }, { status: 200 })
  }

  if (!isUserIdVendorData(payload.vendor_data)) {
    return NextResponse.json({ ok: true, skipped: 'unknown vendor_data' }, { status: 200 })
  }

  const dedupeKey =
    payload.event_id ?? `${payload.session_id}:${payload.status}:${payload.webhook_type}`
  const isNew = await store.recordWebhookEvent(dedupeKey)
  if (!isNew) {
    return NextResponse.json({ ok: true, deduped: true }, { status: 200 })
  }

  try {
    await applyDecision(payload)
  } catch (err) {
    console.error('Failed to apply KYC decision:', err)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
