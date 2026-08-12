import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/didit-webhook";
import { applyDecision } from "@/lib/kyc-status";
import { store } from "@/lib/store";
import type { DiditWebhookPayload } from "@/types/didit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("DIDIT_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const signature = req.headers.get("x-signature-v2");
  const timestamp = req.headers.get("x-timestamp");
  const rawBody = await req.text();

  if (!signature || !timestamp || !verifyWebhook(rawBody, signature, timestamp, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: DiditWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 401 });
  }

  // Never touch production state from a sandbox event or vice versa.
  const expectedEnv = process.env.NODE_ENV === "production" ? "live" : "sandbox";
  if (payload.environment && payload.environment !== expectedEnv) {
    return NextResponse.json({ ok: true, skipped: "environment mismatch" }, { status: 200 });
  }

  const dedupeKey = payload.event_id ?? `${payload.session_id}:${payload.status}:${payload.webhook_type}`;
  const isNew = await store.recordWebhookEvent(dedupeKey);
  if (!isNew) {
    return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
  }

  // Keep this fast: heavy work (media download, AML review, email) should be
  // pushed to a queue in a non-demo setup rather than awaited inline here.
  try {
    await applyDecision(payload);
  } catch (err) {
    console.error("Failed to apply KYC decision:", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
