import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { jsonResponse } from '../_shared/http.ts'
import { verifyStandardWebhook } from '../_shared/standard-webhooks.ts'
import { sendSms } from '../_shared/sms.ts'

/**
 * Supabase's Send SMS Hook (HTTPS). Auth calls this itself whenever a phone
 * OTP needs delivering - never the client, so there is no end-user JWT to
 * check (config.toml: verify_jwt = false). The Standard Webhooks signature is
 * the only authentication, and the response contract is Supabase's hook
 * contract, not a generic API: 200 + `{}` on success, non-200 +
 * `{ error: { http_code, message } }` on failure.
 */

interface SendSmsHookPayload {
  user?: { phone?: string }
  sms?: { otp?: string }
}

function hookError(httpCode: number, message: string) {
  return jsonResponse({ error: { http_code: httpCode, message } }, httpCode)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return hookError(405, 'method not allowed')
  }

  const secret = Deno.env.get('SEND_SMS_HOOK_SECRET')
  if (!secret) {
    console.error('send-sms: SEND_SMS_HOOK_SECRET is not set')
    return hookError(500, 'server misconfigured')
  }

  const rawBody = await req.text()
  const verified = await verifyStandardWebhook(
    rawBody,
    {
      id: req.headers.get('webhook-id'),
      timestamp: req.headers.get('webhook-timestamp'),
      signature: req.headers.get('webhook-signature'),
    },
    secret
  )

  if (!verified) {
    return hookError(401, 'invalid signature')
  }

  let payload: SendSmsHookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return hookError(400, 'invalid body')
  }

  const phone = payload.user?.phone
  const otp = payload.sms?.otp
  if (!phone || !otp) {
    return hookError(400, 'missing phone or otp')
  }

  const text = `${otp} je tvoj SND kod za potvrdu.`
  const result = await sendSms(phone, text)

  if (!result.ok) {
    console.error('send-sms: provider failed', result.error)
    return hookError(500, result.error ?? 'send failed')
  }

  // Accepted is not delivered: this is the id to look up in the Infobip portal.
  console.log(
    `send-sms: accepted for ***${phone.slice(-3)} id=${result.providerMessageId} status=${result.status}`
  )
  return jsonResponse({}, 200)
})
