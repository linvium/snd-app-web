import { store } from "@/lib/store";
import type { DiditWebhookPayload, Decision } from "@/types/didit";

const FEATURE_ARRAY_KEYS = [
  "id_verifications",
  "liveness_checks",
  "face_matches",
  "nfc_verifications",
  "aml_screenings",
  "ip_analyses",
  "poa_verifications",
] as const;

function logWarnings(decision: Decision | undefined, sessionId: string): void {
  if (!decision) return;
  for (const key of FEATURE_ARRAY_KEYS) {
    const arr = decision[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const warnings = (item as { warnings?: unknown[] }).warnings;
      if (warnings && warnings.length > 0) {
        console.warn(`[kyc] session=${sessionId} ${key} node=${item.node_id} warnings:`, warnings);
      }
    }
  }
}

/**
 * Applies a webhook payload (or the equivalent /decision/ response) to the
 * store. Every one of the 10 SessionStatus values has an explicit branch —
 * none may silently fall through to a default.
 */
export async function applyDecision(payload: DiditWebhookPayload): Promise<void> {
  const { status, session_id: sessionId, vendor_data: vendorData, decision } = payload;
  const now = new Date().toISOString();

  const base = {
    vendorData,
    sessionId,
    status,
    updatedAt: now,
  };

  switch (status) {
    case "Approved": {
      await store.upsertVerification({
        ...base,
        verifiedAt: now,
        decision: decision ?? null,
      });
      return;
    }

    case "Declined": {
      logWarnings(decision, sessionId);
      await store.upsertVerification({
        ...base,
        verifiedAt: null,
        decision: decision ?? null,
      });
      return;
    }

    case "In Review": {
      // Pending human review in the Didit console; nothing to finalize yet.
      await store.upsertVerification({
        ...base,
        verifiedAt: null,
        decision: decision ?? null,
      });
      return;
    }

    case "Resubmitted": {
      // Carries resubmit_info.nodes_to_resubmit instead of a decision.
      const existing = await store.getVerificationBySessionId(sessionId);
      await store.upsertVerification({
        ...base,
        verifiedAt: null,
        decision: existing?.decision ?? null,
      });
      return;
    }

    case "Abandoned": {
      // May carry a decision with partial data — persist whatever is there.
      await store.upsertVerification({
        ...base,
        verifiedAt: null,
        decision: decision ?? null,
      });
      return;
    }

    case "Awaiting User": {
      // KYB-only: waiting on a UBO's KYC sub-session. No-op for our KYC flow.
      return;
    }

    case "Expired": {
      // The verification link expired before the user finished.
      await store.upsertVerification({
        ...base,
        verifiedAt: null,
        decision: decision ?? null,
      });
      return;
    }

    case "Kyc Expired": {
      // Previously verified user whose KYC has gone stale.
      await store.upsertVerification({
        ...base,
        verifiedAt: null,
        decision: decision ?? null,
      });
      return;
    }

    case "Not Started":
    case "In Progress": {
      await store.upsertVerification({
        ...base,
        verifiedAt: null,
        decision: decision ?? null,
      });
      return;
    }

    default: {
      // Exhaustiveness guard: TS errors here if a SessionStatus is unhandled.
      const _exhaustive: never = status;
      throw new Error(`Unhandled KYC status: ${_exhaustive}`);
    }
  }
}
