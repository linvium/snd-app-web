/**
 * Verifies the real Standard Webhooks signature (https://www.standardwebhooks.com/)
 * that Supabase Auth Hooks send: `webhook-id` / `webhook-timestamp` /
 * `webhook-signature` headers, base64 HMAC-SHA256 over
 * `{id}.{timestamp}.{body}`, secret prefixed `whsec_`.
 *
 * This is a different scheme from `_shared/webhook.ts` (a bespoke
 * hex/canonical-JSON format built only for the Didit webhook) - do not reuse
 * one for the other.
 */

const TOLERANCE_SECONDS = 5 * 60

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

async function hmacSha256Base64(secretBytes: Uint8Array, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return bytesToBase64(new Uint8Array(signature))
}

export interface StandardWebhookHeaders {
  id: string | null
  timestamp: string | null
  signature: string | null
}

export async function verifyStandardWebhook(
  rawBody: string,
  headers: StandardWebhookHeaders,
  secret: string
): Promise<boolean> {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false

  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false

  const secretBytes = base64ToBytes(
    secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  )
  const expected = await hmacSha256Base64(secretBytes, `${id}.${timestamp}.${rawBody}`)

  // `webhook-signature` can carry several space-separated `v1,<base64>` values.
  return signature.split(' ').some((part) => {
    const value = part.split(',')[1]
    return value ? timingSafeEqual(value, expected) : false
  })
}
