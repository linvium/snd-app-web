import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { OWNER_WITH_BOOKING, UNVERIFIED_USER, VERIFIED_USER } from '../fixtures/users'

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

async function syncPublicUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  verified: boolean
) {
  const { error } = await admin.from('users').upsert({
    id: userId,
    email,
    role: 'user',
    status: 'active',
    email_verified_at: verified ? new Date().toISOString() : null,
  })
  if (error) throw error

  // Confirming Auth copies email_confirmed_at onto public.users via trigger.
  // Clear it after so the publish gate still treats this account as unverified.
  if (!verified) {
    const { error: clearError } = await admin
      .from('users')
      .update({ email_verified_at: null })
      .eq('id', userId)
    if (clearError) throw clearError
  }
}

async function ensureUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  password: string,
  verified: boolean
) {
  const { data: existing } = await admin.auth.admin.listUsers()
  const found = existing.users.find((user) => user.email === email)

  // Auth email must be confirmed so Playwright can sign in. The listing gate
  // reads public.users.email_verified_at, not auth.users.email_confirmed_at.
  if (found) {
    const { error } = await admin.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
    })
    if (error) throw error
    await syncPublicUser(admin, found.id, email, verified)
    await ensureProfile(admin, found.id)
    return found.id
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (created.error || !created.data.user) {
    throw created.error ?? new Error(`Could not create ${email}`)
  }
  const user = created.data.user

  await syncPublicUser(admin, user.id, email, verified)
  await ensureProfile(admin, user.id)

  return user.id
}

async function ensureProfile(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin.from('user_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (data) return
  const { error } = await admin.from('user_profiles').insert({ user_id: userId })
  if (error) throw error
}

async function ensureLocation(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: existing } = await admin
    .from('locations')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (existing?.id) return existing.id as string

  const { data, error } = await admin
    .from('locations')
    .insert({
      user_id: userId,
      label: 'Kuća',
      street: 'Kralja Petra 1',
      city: 'Beograd',
      postal_code: '11000',
      country_code: 'RS',
      latitude: 44.8176,
      longitude: 20.4569,
      approx_latitude: 44.818,
      approx_longitude: 20.457,
      is_default: true,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

async function ensureOwnerListing(
  admin: ReturnType<typeof createClient>,
  ownerId: string,
  renterId: string,
  locationId: string
) {
  const { data: existing } = await admin
    .from('listings')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  let listingId = existing?.id as string | undefined
  if (!listingId) {
    const inserted = await admin
      .from('listings')
      .insert({
        owner_id: ownerId,
        category_id: '9168d11b-06c8-4c29-a56b-ce93a3575177',
        title: 'E2E oglas sa rezervacijom',
        slug: `e2e-oglas-sa-rezervacijom-${ownerId.slice(0, 8)}`,
        description: 'Oglas za Playwright test zaključanih polja uz aktivnu rezervaciju.',
        price_1_day_minor: 80000,
        item_value_minor: 1500000,
        cancellation_policy: 'flexible',
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (inserted.error || !inserted.data) throw inserted.error ?? new Error('Could not create owner listing')
    listingId = inserted.data.id as string
  }

  const { data: link } = await admin
    .from('listing_locations')
    .select('listing_id')
    .eq('listing_id', listingId)
    .eq('location_id', locationId)
    .maybeSingle()
  if (!link) {
    const { error } = await admin
      .from('listing_locations')
      .insert({ listing_id: listingId, location_id: locationId })
    if (error) throw error
  }

  const { data: booking } = await admin
    .from('bookings')
    .select('id')
    .eq('listing_id', listingId)
    .eq('status', 'paid')
    .limit(1)
    .maybeSingle()

  if (!booking) {
    const start = new Date()
    start.setDate(start.getDate() + 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 2)
    const { error } = await admin.from('bookings').insert({
      listing_id: listingId,
      renter_id: renterId,
      owner_id: ownerId,
      pickup_location_id: locationId,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      days_count: 3,
      status: 'paid',
      rental_price_minor: 240000,
      service_fee_minor: 0,
      total_minor: 240000,
      owner_payout_minor: 240000,
      cancellation_policy: 'flexible',
      item_value_minor: 1500000,
      reference: `E2E${Date.now().toString(36).toUpperCase()}`,
      paid_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  return listingId
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const verifiedId = await ensureUser(admin, VERIFIED_USER.email, VERIFIED_USER.password, true)
  const unverifiedId = await ensureUser(admin, UNVERIFIED_USER.email, UNVERIFIED_USER.password, false)
  const ownerId = await ensureUser(admin, OWNER_WITH_BOOKING.email, OWNER_WITH_BOOKING.password, true)
  await ensureLocation(admin, verifiedId)
  const ownerLocationId = await ensureLocation(admin, ownerId)
  await ensureOwnerListing(admin, ownerId, unverifiedId, ownerLocationId)
  console.log('E2E test users are ready.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
