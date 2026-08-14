const REPLAY_WINDOW_SECONDS = 300

function shortenFloats(value: unknown): unknown {
  if (typeof value === 'number') {
    return value % 1 === 0 ? Math.trunc(value) : value
  }
  if (Array.isArray(value)) return value.map(shortenFloats)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = shortenFloats(v)
    }
    return out
  }
  return value
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

function canonicalize(rawBody: string): string {
  return JSON.stringify(sortKeys(shortenFloats(JSON.parse(rawBody))))
}

export function isTimestampFresh(timestampHeader: string, now: number = Date.now()): boolean {
  const ts = Number(timestampHeader)
  if (!Number.isFinite(ts)) return false
  return Math.abs(now / 1000 - ts) <= REPLAY_WINDOW_SECONDS
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  if (!isTimestampFresh(timestamp)) return false

  let canonical: string
  try {
    canonical = canonicalize(rawBody)
  } catch {
    return false
  }

  const expected = await hmacSha256Hex(secret, canonical)
  return timingSafeEqual(signature, expected)
}
