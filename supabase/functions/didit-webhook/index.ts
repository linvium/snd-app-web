import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getDiditEnvironment, isUserIdVendorData, jsonResponse } from '../_shared/helpers.ts'
import { applyDecision } from '../_shared/status.ts'
import { createAdminClient, recordWebhookEvent } from '../_shared/store.ts'
import type { DiditWebhookPayload } from '../_shared/types.ts'
import { verifyWebhook } from '../_shared/webhook.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405)
  }

  const secret = Deno.env.get('DIDIT_WEBHOOK_SECRET')
  if (!secret) {
    console.error('DIDIT_WEBHOOK_SECRET is not set')
    return jsonResponse({ error: 'server misconfigured' }, 500)
  }

  const signature = req.headers.get('x-signature-v2')
  const timestamp = req.headers.get('x-timestamp')
  const rawBody = await req.text()

  if (!signature || !timestamp || !(await verifyWebhook(rawBody, signature, timestamp, secret))) {
    return jsonResponse({ error: 'invalid signature' }, 401)
  }

  let payload: DiditWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'invalid body' }, 401)
  }

  const expectedEnv = getDiditEnvironment()
  if (payload.environment && payload.environment !== expectedEnv) {
    console.warn(
      `[kyc] skipped webhook: Didit environment=${payload.environment} expected=${expectedEnv}`
    )
    return jsonResponse({ ok: true, skipped: 'environment mismatch' }, 200)
  }

  if (!isUserIdVendorData(payload.vendor_data)) {
    return jsonResponse({ ok: true, skipped: 'unknown vendor_data' }, 200)
  }

  const admin = createAdminClient()
  const dedupeKey =
    payload.event_id ?? `${payload.session_id}:${payload.status}:${payload.webhook_type}`
  const isNew = await recordWebhookEvent(admin, dedupeKey)
  if (!isNew) {
    return jsonResponse({ ok: true, deduped: true }, 200)
  }

  try {
    await applyDecision(admin, payload)
  } catch (err) {
    console.error('Failed to apply KYC decision:', err)
    return jsonResponse({ error: 'processing failed' }, 500)
  }

  return jsonResponse({ ok: true }, 200)
})
