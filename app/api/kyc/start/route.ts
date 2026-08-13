import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth/current-user.helpers'
import { createSession } from '@/lib/kyc/didit.service'
import { store } from '@/lib/kyc/kyc.store'

export async function POST() {
  const workflowId = process.env.DIDIT_WORKFLOW_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!workflowId || !appUrl) {
    console.error('DIDIT_WORKFLOW_ID or NEXT_PUBLIC_APP_URL is not set')
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const existing = await store.getVerificationByUserId(userId)
  if (existing?.status === 'verified') {
    return NextResponse.json({ alreadyVerified: true })
  }

  try {
    const session = await createSession({
      workflow_id: workflowId,
      vendor_data: userId,
      callback: `${appUrl}/kyc/done`,
      language: 'sr',
    })

    const now = new Date().toISOString()
    await store.upsertVerification({
      userId,
      sessionId: session.session_id,
      provider: 'didit',
      status: 'in_progress',
      verifiedAt: null,
      rejectedReason: null,
      expiresAt: existing?.expiresAt ?? null,
      updatedAt: now,
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.session_id,
      status: session.status,
    })
  } catch (err) {
    console.error('Failed to create Didit session:', err)
    return NextResponse.json({ error: 'could not start verification' }, { status: 502 })
  }
}
