export type SessionStatus =
  | "Not Started"
  | "In Progress"
  | "Awaiting User"
  | "In Review"
  | "Approved"
  | "Declined"
  | "Resubmitted"
  | "Abandoned"
  | "Expired"
  | "Kyc Expired";

export interface CreateSessionParams {
  workflow_id: string;
  vendor_data: string;
  callback: string;
  language?: string;
  metadata?: Record<string, unknown>;
  sandbox_scenario?: "approve" | "decline";
}

export interface CreateSessionResponse {
  session_id: string;
  session_number: number;
  session_token: string;
  url: string;
  vendor_data: string;
  metadata: Record<string, unknown>;
  status: SessionStatus;
  workflow_id: string;
  workflow_version: number;
  callback: string;
}

export interface IdVerification {
  node_id: string;
  status: string;
  [key: string]: unknown;
}

export interface LivenessCheck {
  node_id: string;
  status: string;
  [key: string]: unknown;
}

export interface FaceMatch {
  node_id: string;
  status: string;
  [key: string]: unknown;
}

export interface NfcVerification {
  node_id: string;
  status: string;
  [key: string]: unknown;
}

export interface AmlScreening {
  node_id: string;
  status: string;
  warnings?: unknown[];
  [key: string]: unknown;
}

export interface IpAnalysis {
  node_id: string;
  status: string;
  [key: string]: unknown;
}

export interface PoaVerification {
  node_id: string;
  status: string;
  [key: string]: unknown;
}

export interface ResubmitInfo {
  nodes_to_resubmit: string[];
  [key: string]: unknown;
}

export interface Decision {
  session_id: string;
  session_number: number;
  vendor_data: string;
  metadata: Record<string, unknown>;
  status: SessionStatus;
  workflow_id: string;
  workflow_version: number;
  callback: string;
  environment?: "live" | "sandbox";
  id_verifications?: IdVerification[] | null;
  liveness_checks?: LivenessCheck[] | null;
  face_matches?: FaceMatch[] | null;
  nfc_verifications?: NfcVerification[] | null;
  aml_screenings?: AmlScreening[] | null;
  ip_analyses?: IpAnalysis[] | null;
  poa_verifications?: PoaVerification[] | null;
  resubmit_info?: ResubmitInfo | null;
  [key: string]: unknown;
}

export interface DiditWebhookPayload {
  event_id: string;
  webhook_type: "status.updated" | "data.updated" | string;
  session_id: string;
  status: SessionStatus;
  vendor_data: string;
  environment?: "live" | "sandbox";
  timestamp?: number;
  decision?: Decision;
  resubmit_info?: ResubmitInfo | null;
  [key: string]: unknown;
}
