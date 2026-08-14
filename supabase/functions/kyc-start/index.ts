import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createSession } from '../_shared/didit.ts'
import { corsHeaders, jsonResponse } from '../_shared/helpers.ts'
import { createAdminClient, getVerificationByUserId, upsertVerification } from '../_shared/store.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405, corsHeaders)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'unauthenticated' }, 401, corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'server misconfigured' }, 500, corsHeaders)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) {
    return jsonResponse({ error: 'unauthenticated' }, 401, corsHeaders)
  }

  const workflowId = Deno.env.get('DIDIT_WORKFLOW_ID')
  const appUrl = Deno.env.get('APP_URL')
  if (!workflowId || !appUrl) {
    console.error('DIDIT_WORKFLOW_ID or APP_URL is not set')
    return jsonResponse({ error: 'server misconfigured' }, 500, corsHeaders)
  }

  try {
    const admin = createAdminClient()
    const existing = await getVerificationByUserId(admin, user.id)
    if (existing?.status === 'verified') {
      return jsonResponse({ alreadyVerified: true }, 200, corsHeaders)
    }

    const session = await createSession({
      workflow_id: workflowId,
      vendor_data: user.id,
      callback: `${appUrl.replace(/\/$/, '')}/kyc/done`,
      language: 'sr',
    })

    const now = new Date().toISOString()
    await upsertVerification(admin, {
      userId: user.id,
      sessionId: session.session_id,
      provider: 'didit',
      status: 'in_progress',
      verifiedAt: null,
      rejectedReason: null,
      expiresAt: existing?.expiresAt ?? null,
      updatedAt: now,
    })

    return jsonResponse(
      {
        url: session.url,
        sessionId: session.session_id,
        status: session.status,
      },
      200,
      corsHeaders
    )
  } catch (err) {
    console.error('Failed to create Didit session:', err)
    return jsonResponse({ error: 'could not start verification' }, 502, corsHeaders)
  }
})
