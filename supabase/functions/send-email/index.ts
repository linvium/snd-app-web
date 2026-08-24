import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'
import {
  createAdminClient,
  renderEmail,
  sendEmail,
  type EmailMessageRow,
  type EmailTemplateRow,
} from '../_shared/email.ts'

/**
 * Drains the `email_messages` outbox.
 *
 * The lifecycle RPCs queue rows inside the transaction that changed the
 * booking; this sends them. It is safe to call at any time and from anywhere -
 * the queue is the only input, so a caller cannot choose a recipient or a body.
 * Call it after a mutation for immediate delivery, and on a schedule so a
 * failed provider call is retried rather than lost.
 *
 * Body (all optional):
 *   { "messageId": "uuid" }  - send just this one, even if it already failed
 *   { "limit": 25 }          - how many queued rows to take (default 25, max 100)
 */

const MAX_ATTEMPTS = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders)
  }

  let body: { messageId?: string; limit?: number } = {}
  try {
    body = (await req.json()) as { messageId?: string; limit?: number }
  } catch {
    // An empty body means "send whatever is queued".
  }

  const limit = Math.min(Math.max(body.limit ?? 25, 1), 100)

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('send-email: admin client', error)
    return jsonResponse({ error: 'server misconfigured' }, 500, corsHeaders)
  }

  let query = admin
    .from('email_messages')
    .select('id, template_key, to_email, variables, attempts')
    .lte('scheduled_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(limit)

  query = body.messageId
    ? admin
        .from('email_messages')
        .select('id, template_key, to_email, variables, attempts')
        .eq('id', body.messageId)
    : query.eq('status', 'queued')

  const { data: messages, error } = await query
  if (error) {
    console.error('send-email: load queue', error)
    return jsonResponse({ error: 'queue unavailable' }, 500, corsHeaders)
  }

  const rows = (messages ?? []) as EmailMessageRow[]
  if (rows.length === 0) {
    return jsonResponse({ sent: 0, failed: 0, skipped: 0 }, 200, corsHeaders)
  }

  const templateKeys = [...new Set(rows.map((row) => row.template_key))]
  const { data: templates, error: templateError } = await admin
    .from('email_templates')
    .select('key, subject, html_body, text_body, is_active')
    .in('key', templateKeys)

  if (templateError) {
    console.error('send-email: load templates', templateError)
    return jsonResponse({ error: 'templates unavailable' }, 500, corsHeaders)
  }

  const templateByKey = new Map(
    ((templates ?? []) as EmailTemplateRow[]).map((row) => [row.key, row])
  )

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const row of rows) {
    const template = templateByKey.get(row.template_key)

    // A template that was deactivated after the row was queued is a decision,
    // not a failure: stop trying to send it.
    if (!template || !template.is_active) {
      skipped += 1
      await admin
        .from('email_messages')
        .update({ status: 'cancelled', last_error: 'template missing or inactive' })
        .eq('id', row.id)
      continue
    }

    // Claim the row first. Two concurrent drains then cannot both send it.
    const { data: claimed, error: claimError } = await admin
      .from('email_messages')
      .update({ status: 'sending', attempts: row.attempts + 1 })
      .eq('id', row.id)
      .in('status', ['queued', 'failed'])
      .select('id')
      .maybeSingle()

    if (claimError || !claimed) {
      skipped += 1
      continue
    }

    const rendered = renderEmail(template, row.variables ?? {})
    const result = await sendEmail(rendered, row.to_email)

    if (result.ok) {
      sent += 1
      await admin
        .from('email_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          subject: rendered.subject,
          provider_message_id: result.providerMessageId,
          last_error: null,
        })
        .eq('id', row.id)
      continue
    }

    failed += 1
    const attempts = row.attempts + 1
    await admin
      .from('email_messages')
      .update({
        // Below the ceiling the row goes back on the queue for the next drain;
        // at the ceiling it stops so a broken address cannot loop forever.
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
        subject: rendered.subject,
        last_error: result.error,
      })
      .eq('id', row.id)
  }

  return jsonResponse({ sent, failed, skipped }, 200, corsHeaders)
})
