import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface EmailTemplateRow {
  key: string
  subject: string
  html_body: string
  text_body: string | null
  is_active: boolean
}

export interface EmailMessageRow {
  id: string
  template_key: string
  to_email: string
  variables: Record<string, unknown>
  attempts: number
}

export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase admin env is not set')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function appUrl(): string {
  return (Deno.env.get('APP_URL') ?? 'https://stvarnadan.rs').replace(/\/$/, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * The database stores paths, not URLs, so one deploy's mail can never point at
 * another environment. The `_url` variables are derived here from APP_URL.
 */
export function withDerivedVariables(
  variables: Record<string, unknown>
): Record<string, string> {
  const base = appUrl()
  const out: Record<string, string> = { app_url: base }

  for (const [key, value] of Object.entries(variables)) {
    out[key] = value == null ? '' : String(value)
  }

  for (const [name, path] of [
    ['thread_url', out.thread_path],
    ['payment_url', out.payment_path],
  ] as const) {
    if (path) out[name] = path.startsWith('http') ? path : `${base}${path}`
  }

  return out
}

/** `{{name}}` only. An unknown placeholder renders empty rather than literally. */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
  escape: boolean
): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, name: string) => {
    const value = variables[name] ?? ''
    return escape ? escapeHtml(value) : value
  })
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string | null
}

export function renderEmail(
  template: EmailTemplateRow,
  variables: Record<string, unknown>
): RenderedEmail {
  const vars = withDerivedVariables(variables)
  return {
    subject: renderTemplate(template.subject, vars, false),
    html: renderTemplate(template.html_body, vars, true),
    text: template.text_body ? renderTemplate(template.text_body, vars, false) : null,
  }
}

export interface SendResult {
  ok: boolean
  providerMessageId: string | null
  error: string | null
}

/**
 * Resend is the provider. Without a key the mail is not silently dropped - it
 * fails with a readable reason and stays in the outbox for a later attempt.
 */
export async function sendEmail(email: RenderedEmail, to: string): Promise<SendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') ?? 'Stvar na dan <noreply@stvarnadan.rs>'

  if (!apiKey) {
    return { ok: false, providerMessageId: null, error: 'RESEND_API_KEY is not set' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: email.subject,
        html: email.html,
        ...(email.text ? { text: email.text } : {}),
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string }
      | null

    if (!response.ok) {
      return {
        ok: false,
        providerMessageId: null,
        error: payload?.message ?? `provider responded ${response.status}`,
      }
    }

    return { ok: true, providerMessageId: payload?.id ?? null, error: null }
  } catch (error) {
    return {
      ok: false,
      providerMessageId: null,
      error: error instanceof Error ? error.message : 'send failed',
    }
  }
}
