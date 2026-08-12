import { describe, it, expect } from "vitest";
import { applyDecision } from "@/lib/kyc-status";
import { store } from "@/lib/store";
import type { DiditWebhookPayload, SessionStatus } from "@/types/didit";

const ALL_STATUSES: SessionStatus[] = [
  "Not Started",
  "In Progress",
  "Awaiting User",
  "In Review",
  "Approved",
  "Declined",
  "Resubmitted",
  "Abandoned",
  "Expired",
  "Kyc Expired",
];

function payloadFor(status: SessionStatus, sessionId: string): DiditWebhookPayload {
  return {
    event_id: `evt-${sessionId}`,
    webhook_type: "status.updated",
    session_id: sessionId,
    status,
    vendor_data: `vendor-${sessionId}`,
  };
}

describe("applyDecision", () => {
  it("has an explicit branch for all 10 statuses (none throw)", async () => {
    for (const status of ALL_STATUSES) {
      const sessionId = `sess-${status.replace(/\s/g, "")}`;
      await expect(applyDecision(payloadFor(status, sessionId))).resolves.not.toThrow();
    }
  });

  it("marks Approved as verified", async () => {
    const sessionId = "sess-approved-check";
    await applyDecision(payloadFor("Approved", sessionId));
    const record = await store.getVerificationBySessionId(sessionId);
    expect(record?.verifiedAt).not.toBeNull();
    expect(record?.status).toBe("Approved");
  });

  it("marks Kyc Expired as not verified", async () => {
    const sessionId = "sess-kycexpired-check";
    await applyDecision(payloadFor("Kyc Expired", sessionId));
    const record = await store.getVerificationBySessionId(sessionId);
    expect(record?.verifiedAt).toBeNull();
  });

  it("Awaiting User is a no-op and does not create a record", async () => {
    const sessionId = "sess-awaiting-check";
    await applyDecision(payloadFor("Awaiting User", sessionId));
    const record = await store.getVerificationBySessionId(sessionId);
    expect(record).toBeNull();
  });
});

describe("webhook event dedupe", () => {
  it("only records the first occurrence of an event_id", async () => {
    const eventId = `dedupe-test-${Date.now()}`;
    const first = await store.recordWebhookEvent(eventId);
    const second = await store.recordWebhookEvent(eventId);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
