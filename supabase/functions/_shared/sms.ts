/**
 * Infobip Messages API - same fetch-based provider shape as `_shared/email.ts`.
 *
 * Only SMS ships today. WhatsApp/Viber failover is designed into the channel
 * order below but stays disabled: the exact failover JSON field names are not
 * guessed here - confirm them against Infobip's current docs and
 * `POST /resource-management/1/messages/validate` before flipping
 * `INFOBIP_WHATSAPP_ENABLED` / `INFOBIP_VIBER_ENABLED` on.
 */

export interface SendSmsResult {
  ok: boolean
  providerMessageId: string | null
  error: string | null
  /** Infobip's status name for the accepted message, e.g. PENDING_ACCEPTED. */
  status?: string | null
}

interface InfobipMessageStatus {
  groupId?: number
  name?: string
}

interface InfobipSendResponse {
  messages?: { messageId?: string; status?: InfobipMessageStatus }[]
  requestError?: { serviceException?: { messageId?: string; text?: string } }
}

export async function sendSms(to: string, text: string): Promise<SendSmsResult> {
  const baseUrl = Deno.env.get('INFOBIP_BASE_URL')
  const apiKey = Deno.env.get('INFOBIP_API_KEY')
  const sender = Deno.env.get('INFOBIP_SMS_SENDER')

  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      providerMessageId: null,
      error: 'INFOBIP_BASE_URL or INFOBIP_API_KEY is not set',
    }
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/messages-api/1/messages`, {
      method: 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            channel: 'SMS',
            ...(sender ? { sender } : {}),
            destinations: [{ to }],
            content: { body: { type: 'TEXT', text } },
          },
        ],
      }),
    })

    const payload = (await response.json().catch(() => null)) as InfobipSendResponse | null

    if (!response.ok) {
      return {
        ok: false,
        providerMessageId: null,
        error: payload?.requestError?.serviceException?.text ?? `provider responded ${response.status}`,
      }
    }

    const first = payload?.messages?.[0]
    // Infobip reports per-message delivery status even on HTTP 200 - group 3
    // (and above) means it was not accepted for delivery.
    if (first?.status?.groupId != null && first.status.groupId >= 3) {
      return {
        ok: false,
        providerMessageId: first.messageId ?? null,
        error: first.status.name ?? 'undeliverable',
      }
    }

    return {
      ok: true,
      providerMessageId: first?.messageId ?? null,
      error: null,
      status: first?.status?.name ?? null,
    }
  } catch (error) {
    return {
      ok: false,
      providerMessageId: null,
      error: error instanceof Error ? error.message : 'send failed',
    }
  }
}
