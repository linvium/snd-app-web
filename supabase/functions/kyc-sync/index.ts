import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getDecision } from '../_shared/didit.ts'
import { corsHeaders, isTerminalKycStatus, jsonResponse } from '../_shared/helpers.ts'
import { applyDecision } from '../_shared/status.ts'
import { createAdminClient, getVerificationBySessionId } from '../_shared/store.ts'
import type { DiditWebhookPayload } from '../_shared/types.ts'

const SESSION_ID_RE = /^[0-9a-f-]{8,64}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders)
  }

  const sessionId = new URL(req.url).searchParams.get('session_id')
  if (!sessionId || !SESSION_ID_RE.test(sessionId)) {
    return jsonResponse({ error: 'invalid session_id' }, 400, corsHeaders)
  }

  try {
    const admin = createAdminClient()
    const existing = await getVerificationBySessionId(admin, sessionId)
    if (existing && isTerminalKycStatus(existing.status)) {
      return jsonResponse(existing, 200, corsHeaders)
    }

    try {
      const decision = await getDecision(sessionId)
      const payload: DiditWebhookPayload = {
        event_id: `decision-fallback:${sessionId}:${decision.status}`,
        webhook_type: 'status.updated',
        session_id: decision.session_id,
        status: decision.status,
        vendor_data: decision.vendor_data,
        environment: decision.environment,
        decision,
      }
      await applyDecision(admin, payload)
    } catch (err) {
      console.error('KYC decision fallback failed:', err)
      if (existing) return jsonResponse(existing, 200, corsHeaders)
    }

    const record = await getVerificationBySessionId(admin, sessionId)
    if (!record) {
      return jsonResponse({ error: 'not found' }, 404, corsHeaders)
    }
    return jsonResponse(record, 200, corsHeaders)
  } catch (err) {
    console.error('kyc-sync failed:', err)
    return jsonResponse({ error: 'sync failed' }, 500, corsHeaders)
  }
})
