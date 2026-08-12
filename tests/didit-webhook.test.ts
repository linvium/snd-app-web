import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhook } from "@/lib/didit-webhook";

const SECRET = "test-secret";

function sign(body: string): string {
  const parsed = JSON.parse(body);

  function shortenFloats(v: unknown): unknown {
    if (typeof v === "number") return v % 1 === 0 ? Math.trunc(v) : v;
    if (Array.isArray(v)) return v.map(shortenFloats);
    if (v !== null && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = shortenFloats(val);
      return out;
    }
    return v;
  }

  function sortKeys(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v !== null && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = sortKeys((v as Record<string, unknown>)[k]);
      }
      return out;
    }
    return v;
  }

  const canonical = JSON.stringify(sortKeys(shortenFloats(parsed)));
  return createHmac("sha256", SECRET).update(canonical, "utf8").digest("hex");
}

describe("verifyWebhook", () => {
  it("accepts a validly signed payload", () => {
    const body = JSON.stringify({ b: 1, a: { z: 1.0, y: 2 } });
    const sig = sign(body);
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verifyWebhook(body, sig, ts, SECRET)).toBe(true);
  });

  it("rejects a payload whose body was altered after signing", () => {
    const body = JSON.stringify({ b: 1, a: 2 });
    const sig = sign(body);
    const tampered = JSON.stringify({ b: 1, a: 3 });
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verifyWebhook(tampered, sig, ts, SECRET)).toBe(false);
  });

  it("rejects a stale timestamp even with a valid signature", () => {
    const body = JSON.stringify({ b: 1 });
    const sig = sign(body);
    const staleTs = String(Math.floor(Date.now() / 1000) - 600);
    expect(verifyWebhook(body, sig, staleTs, SECRET)).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    const body = JSON.stringify({ b: 1 });
    const ts = String(Math.floor(Date.now() / 1000));
    expect(() => verifyWebhook(body, "short", ts, SECRET)).not.toThrow();
    expect(verifyWebhook(body, "short", ts, SECRET)).toBe(false);
  });
});
