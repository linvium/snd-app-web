import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { CONTACT_LISTING, VERIFIED_USER } from '../fixtures/users'

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const line of text.split('\n')) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (!match || process.env[match[1]]) continue
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim()
      }
    } catch {
      // optional file
    }
  }
}

function adminClient() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function cleanupRentalRequests() {
  const admin = adminClient()
  if (!admin) return

  const { data: listing } = await admin
    .from('listings')
    .select('id')
    .eq('slug', CONTACT_LISTING.slug)
    .maybeSingle()
  if (!listing?.id) return

  const { data: users } = await admin.auth.admin.listUsers()
  const renter = users.users.find((user) => user.email === VERIFIED_USER.email)
  if (!renter) return

  const { data: conversations } = await admin
    .from('conversations')
    .select('id')
    .eq('listing_id', listing.id)
    .eq('renter_id', renter.id)

  const conversationIds = (conversations ?? []).map((row) => row.id as string)
  if (conversationIds.length > 0) {
    await admin.from('messages').delete().in('conversation_id', conversationIds)
    await admin.from('conversations').delete().in('id', conversationIds)
  }

  await admin.from('bookings').delete().eq('listing_id', listing.id).eq('renter_id', renter.id).eq('status', 'requested')
}
