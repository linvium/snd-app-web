import { createHmac, timingSafeEqual } from "crypto";

const REPLAY_WINDOW_SECONDS = 300;

function shortenFloats(value: unknown): unknown {
  if (typeof value === "number") {
    return value % 1 === 0 ? Math.trunc(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map(shortenFloats);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = shortenFloats(v);
    }
    return out;
  }
  return value;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    // Array order is preserved; only object keys are sorted.
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function canonicalize(rawBody: string): string {
  const parsed = JSON.parse(rawBody);
  return JSON.stringify(sortKeys(shortenFloats(parsed)));
}

export function isTimestampFresh(timestampHeader: string, now: number = Date.now()): boolean {
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(now / 1000 - ts) <= REPLAY_WINDOW_SECONDS;
}

/**
 * Verifies a Didit v3 webhook signature.
 * Pipeline: shortenFloats -> sortKeys -> JSON.stringify -> HMAC-SHA256 -> hex
 * -> constant-time compare against X-Signature-V2.
 */
export function verifyWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  if (!isTimestampFresh(timestamp)) return false;

  let canonical: string;
  try {
    canonical = canonicalize(rawBody);
  } catch {
    return false;
  }

  const expected = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(expectedBuf));
}
