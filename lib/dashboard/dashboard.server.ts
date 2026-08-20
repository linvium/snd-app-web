import type { SupabaseClient } from '@supabase/supabase-js'

import { listingEditPath } from '@/lib/listings/listings.paths'
import { listConversations } from '@/lib/messages/messages.server'
import { requestCardDatesLabel, requestThreadPath } from '@/lib/messages'
import { calculateProfileCompleteness } from '@/lib/profiles/profile.completeness'
import { formatMemberSince, getProfileInitials } from '@/lib/profiles/profile.helpers'
import { sortActions } from '@/lib/dashboard/dashboard.helpers'
import { getDisplayName } from '@/types'
import type {
  ConversationSummary,
  DashboardAction,
  DashboardListingRow,
  DashboardSummary,
  DashboardTotals,
  KycDbStatus,
  ListingStatus,
  SndLocation,
  SndUser,
} from '@/types'

/** A request left hanging this long is the thing to fix first. */
const STALE_REQUEST_MS = 48 * 60 * 60 * 1000

const OWNED_LISTING_STATUSES = ['draft', 'published', 'paused'] as const

type ListingRow = {
  id: string
  slug: string | null
  title: string | null
  status: ListingStatus
  price_1_day_minor: number | null
  view_count: number | null
  favorite_count: number | null
}

async function loadUser(supabase: SupabaseClient, userId: string): Promise<SndUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, user_profiles (*)')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as SndUser & { user_profiles?: SndUser['user_profiles'] | SndUser['user_profiles'][] }
  return {
    ...row,
    user_profiles: Array.isArray(row.user_profiles) ? (row.user_profiles[0] ?? null) : (row.user_profiles ?? null),
  }
}

function buildRequestActions(conversations: ConversationSummary[], now: number): DashboardAction[] {
  const actions: DashboardAction[] = []

  for (const conversation of conversations) {
    const pendingRequest =
      conversation.viewer_role === 'owner' && conversation.booking?.status === 'requested'
    const unread = conversation.unread_count > 0

    if (!pendingRequest && !unread) continue

    const waitedMs = conversation.last_message_at
      ? now - Date.parse(conversation.last_message_at)
      : 0
    const stale = Number.isFinite(waitedMs) && waitedMs > STALE_REQUEST_MS

    if (pendingRequest) {
      actions.push({
        id: `request:${conversation.id}`,
        kind: 'request',
        tone: stale ? 'urgent' : 'attention',
        title: stale ? 'Zahtev čeka tvoj odgovor duže od dva dana' : 'Zahtev čeka tvoju potvrdu',
        detail: [
          conversation.other_party.display_name,
          conversation.listing.title,
          requestCardDatesLabel(conversation.booking?.start_date ?? null, conversation.booking?.end_date ?? null),
        ].join(' · '),
        href: requestThreadPath(conversation.id),
        cta: 'Pregledaj',
        thumbnail_url: conversation.listing.thumbnail_url,
      })
      continue
    }

    actions.push({
      id: `unread:${conversation.id}`,
      kind: 'unread',
      tone: stale ? 'urgent' : 'attention',
      title:
        conversation.unread_count > 1
          ? `${conversation.unread_count} nepročitane poruke`
          : 'Nepročitana poruka',
      detail: [conversation.other_party.display_name, conversation.listing.title]
        .filter(Boolean)
        .join(' · '),
      href: requestThreadPath(conversation.id),
      cta: 'Otvori',
      thumbnail_url: conversation.listing.thumbnail_url,
    })
  }

  return actions
}

function buildDraftActions(rows: DashboardListingRow[]): DashboardAction[] {
  return rows
    .filter((row) => row.status === 'draft')
    .slice(0, 3)
    .map((row) => ({
      id: `draft:${row.id}`,
      kind: 'draft' as const,
      tone: 'calm' as const,
      title: 'Nacrt oglasa nije objavljen',
      detail: row.title,
      href: listingEditPath(row.id),
      cta: 'Nastavi',
      thumbnail_url: row.thumbnail_url,
    }))
}

/**
 * Everything the manager home shows, in one round trip.
 *
 * Only numbers the database actually holds end up here — there is no revenue,
 * payout or period-over-period trend, because nothing in the product produces
 * them yet.
 */
export async function loadDashboard(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<DashboardSummary | null> {
  const [user, listingResult, locationResult, kycResult, conversationResult] = await Promise.all([
    loadUser(supabase, userId),
    supabase
      .from('listings')
      .select('id, slug, title, status, price_1_day_minor, view_count, favorite_count')
      .eq('owner_id', userId)
      .in('status', OWNED_LISTING_STATUSES)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('locations')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase.from('kyc_verifications').select('status').eq('user_id', userId).maybeSingle(),
    listConversations(supabase, userId),
  ])

  if (!user) return null

  const listingRows = (listingResult.data ?? []) as ListingRow[]
  const listingIds = listingRows.map((row) => row.id)

  const [{ data: images }, { data: requestRows }] = await Promise.all([
    listingIds.length > 0
      ? supabase
          .from('listing_images')
          .select('listing_id, thumbnail_url, sort_order')
          .in('listing_id', listingIds)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] as { listing_id: string; thumbnail_url: string | null }[] }),
    listingIds.length > 0
      ? supabase.from('conversations').select('listing_id').eq('owner_id', userId)
      : Promise.resolve({ data: [] as { listing_id: string }[] }),
  ])

  const thumbByListing = new Map<string, string>()
  for (const image of images ?? []) {
    const listingId = image.listing_id as string
    if (!thumbByListing.has(listingId) && image.thumbnail_url) {
      thumbByListing.set(listingId, image.thumbnail_url as string)
    }
  }

  const requestsByListing = new Map<string, number>()
  for (const row of requestRows ?? []) {
    const listingId = row.listing_id as string
    requestsByListing.set(listingId, (requestsByListing.get(listingId) ?? 0) + 1)
  }

  const listings: DashboardListingRow[] = listingRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title ?? 'Bez naslova',
    thumbnail_url: thumbByListing.get(row.id) ?? null,
    price_1_day_minor: row.price_1_day_minor ?? 0,
    status: row.status,
    view_count: row.view_count ?? 0,
    favorite_count: row.favorite_count ?? 0,
    request_count: requestsByListing.get(row.id) ?? 0,
  }))

  const conversations: ConversationSummary[] = Array.isArray(conversationResult)
    ? conversationResult
    : []
  const locations = (locationResult.data ?? []) as SndLocation[]
  const kycStatus = (kycResult.data?.status as KycDbStatus | undefined) ?? null
  const completeness = calculateProfileCompleteness(user, locations, kycStatus)

  const actions = sortActions([
    ...buildRequestActions(conversations, now.getTime()),
    ...buildDraftActions(listings),
  ])

  const profile = user.user_profiles
  const totals: DashboardTotals = {
    listings_published: listings.filter((row) => row.status === 'published').length,
    listings_draft: listings.filter((row) => row.status === 'draft').length,
    listings_paused: listings.filter((row) => row.status === 'paused').length,
    views: listings.reduce((sum, row) => sum + row.view_count, 0),
    saves: listings.reduce((sum, row) => sum + row.favorite_count, 0),
    open_requests: conversations.filter(
      (conversation) =>
        conversation.viewer_role === 'owner' && conversation.booking?.status === 'requested'
    ).length,
    unread_messages: conversations.reduce((sum, conversation) => sum + conversation.unread_count, 0),
    rating_avg: profile?.rating_avg == null ? null : Number(profile.rating_avg),
    rating_count: Number(profile?.rating_count ?? 0),
    response_rate: profile?.response_rate == null ? null : Number(profile.response_rate),
    avg_response_minutes: profile?.avg_response_minutes ?? null,
  }

  return {
    identity: {
      user_id: user.id,
      email: user.email,
      display_name: getDisplayName(profile, user.email),
      initials: getProfileInitials(profile?.first_name, profile?.last_name, user.email),
      avatar_url: profile?.avatar_url ?? null,
      member_since: user.created_at ? formatMemberSince(user.created_at) : null,
      kyc_status: kycStatus,
      is_verified: kycStatus === 'verified',
    },
    completeness,
    actions,
    totals,
    listings,
  }
}
