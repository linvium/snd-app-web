import type { Decision, SessionStatus } from "@/types/didit";

export interface KycVerification {
  vendorData: string;
  sessionId: string;
  status: SessionStatus;
  verifiedAt: string | null;
  decision: Decision | null;
  updatedAt: string;
}

export interface KycStore {
  upsertVerification(v: KycVerification): Promise<void>;
  getVerificationByVendorData(vendorData: string): Promise<KycVerification | null>;
  getVerificationBySessionId(sessionId: string): Promise<KycVerification | null>;

  /** Returns false (no-op) if event_id was already seen. */
  recordWebhookEvent(eventId: string): Promise<boolean>;
  hasWebhookEvent(eventId: string): Promise<boolean>;
}

class InMemoryKycStore implements KycStore {
  private byVendorData = new Map<string, KycVerification>();
  private bySessionId = new Map<string, KycVerification>();
  private webhookEventIds = new Set<string>();

  async upsertVerification(v: KycVerification): Promise<void> {
    this.byVendorData.set(v.vendorData, v);
    this.bySessionId.set(v.sessionId, v);
  }

  async getVerificationByVendorData(vendorData: string): Promise<KycVerification | null> {
    return this.byVendorData.get(vendorData) ?? null;
  }

  async getVerificationBySessionId(sessionId: string): Promise<KycVerification | null> {
    return this.bySessionId.get(sessionId) ?? null;
  }

  async recordWebhookEvent(eventId: string): Promise<boolean> {
    if (this.webhookEventIds.has(eventId)) return false;
    this.webhookEventIds.add(eventId);
    return true;
  }

  async hasWebhookEvent(eventId: string): Promise<boolean> {
    return this.webhookEventIds.has(eventId);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __kycStore: KycStore | undefined;
}

// Survives HMR/module reloads in dev; a real DB wouldn't need this.
export const store: KycStore = globalThis.__kycStore ?? new InMemoryKycStore();
globalThis.__kycStore = store;
