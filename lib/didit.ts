import type { CreateSessionParams, CreateSessionResponse, Decision } from "@/types/didit";

const BASE_URL = "https://verification.didit.me";

function getApiKey(): string {
  const key = process.env.DIDIT_API_KEY;
  if (!key) {
    throw new Error("DIDIT_API_KEY is not set");
  }
  return key;
}

async function diditFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "x-api-key": getApiKey(),
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    console.error(`Didit API error ${res.status} ${path}:`, body);
    throw new Error(`Didit API request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function createSession(params: CreateSessionParams): Promise<CreateSessionResponse> {
  return diditFetch<CreateSessionResponse>("/v3/session/", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function getDecision(sessionId: string): Promise<Decision> {
  return diditFetch<Decision>(`/v3/session/${sessionId}/decision/`, {
    method: "GET",
  });
}
