import type { SupabaseClient } from '@supabase/supabase-js'

import { apiError, ERROR_CODES } from '@/lib/api/response'
import { validateMessageBody } from '@/lib/bookings/bookings.validation'
import { conversationPartyLabel, sortConversationsForInbox } from '@/lib/messages/messages.helpers'
import type {
  ConversationBookingSummary,
  ConversationSummary,
  ConversationThread,
  Message,
  MessageType,
} from '@/types/message'

const CONVERSATION_COLUMNS =
  'id, listing_id, renter_id, owner_id, booking_id, last_message_at, last_message_preview, renter_unread_count, owner_unread_count'

type ConversationRow = {
  id: string
  listing_id: string
  renter_id: string
  owner_id: string
  booking_id: string | null
  last_message_at: string | null
  last_message_preview: string | null
  renter_unread_count: number
  owner_unread_count: number
}

function isParticipant(row: ConversationRow, userId: string) {
  return row.renter_id === userId || row.owner_id === userId
}

function unreadCount(row: ConversationRow, userId: string) {
  return row.renter_id === userId ? row.renter_unread_count : row.owner_unread_count
}

async function hydrateConversations(
  supabase: SupabaseClient,
  rows: ConversationRow[],
  userId: string
): Promise<ConversationSummary[]> {
  if (rows.length === 0) return []

  const listingIds = [...new Set(rows.map((row) => row.listing_id))]
  const bookingIds = rows.map((row) => row.booking_id).filter((id): id is string => Boolean(id))
  const otherIds = [...new Set(rows.map((row) => (row.renter_id === userId ? row.owner_id : row.renter_id)))]

  const [{ data: listings }, { data: images }, { data: parties }, { data: bookings }] = await Promise.all([
    supabase.from('listings').select('id, title, slug').in('id', listingIds),
    supabase
      .from('listing_images')
      .select('listing_id, thumbnail_url, sort_order')
      .in('listing_id', listingIds)
      .order('sort_order', { ascending: true }),
    supabase.rpc('snd_conversation_parties', { p_user_ids: otherIds }),
    bookingIds.length > 0
      ? supabase.from('bookings').select('id, start_date, end_date, status').in('id', bookingIds)
      : Promise.resolve({ data: [] }),
  ])

  const listingById = new Map((listings ?? []).map((row) => [row.id as string, row]))
  const thumbByListing = new Map<string, string>()
  for (const image of images ?? []) {
    const listingId = image.listing_id as string
    if (!thumbByListing.has(listingId) && image.thumbnail_url) {
      thumbByListing.set(listingId, image.thumbnail_url as string)
    }
  }
  const partyByUser = new Map(
    ((parties ?? []) as Array<{
      user_id: string
      display_name: string | null
      first_name: string | null
      last_name: string | null
      avatar_url: string | null
      email: string | null
    }>).map((row) => [row.user_id, row])
  )
  const bookingById = new Map(
    (bookings ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        start_date: (row.start_date as string | null) ?? null,
        end_date: (row.end_date as string | null) ?? null,
        status: row.status as string,
      } satisfies ConversationBookingSummary,
    ])
  )

  return rows.map((row) => {
    const otherId = row.renter_id === userId ? row.owner_id : row.renter_id
    const party = partyByUser.get(otherId)
    const listing = listingById.get(row.listing_id)
    return {
      id: row.id,
      listing: {
        id: row.listing_id,
        title: (listing?.title as string | null) ?? 'Oglas',
        slug: (listing?.slug as string | null) ?? null,
        thumbnail_url: thumbByListing.get(row.listing_id) ?? null,
      },
      other_party: {
        id: otherId,
        display_name: conversationPartyLabel(
          party
            ? {
                display_name: party.display_name,
                first_name: party.first_name,
                last_name: party.last_name,
              }
            : null,
          party?.email ?? null
        ),
        avatar_url: party?.avatar_url ?? null,
      },
      booking: row.booking_id ? bookingById.get(row.booking_id) ?? null : null,
      last_message_at: row.last_message_at,
      last_message_preview: row.last_message_preview,
      unread_count: unreadCount(row, userId),
    }
  })
}

export async function listConversations(
  supabase: SupabaseClient,
  userId: string
): Promise<ConversationSummary[] | { response: ReturnType<typeof apiError> }> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[messages] list failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  const conversations = await hydrateConversations(supabase, (data ?? []) as ConversationRow[], userId)
  return sortConversationsForInbox(conversations)
}

export async function getConversationThread(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string
): Promise<ConversationThread | { response: ReturnType<typeof apiError> }> {
  const { data: row, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    console.error('[messages] load conversation failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  if (!row || !isParticipant(row as ConversationRow, userId)) {
    return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Razgovor nije pronađen.') }
  }

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, type, body, metadata, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('[messages] load messages failed', messagesError)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  const [summary] = await hydrateConversations(supabase, [row as ConversationRow], userId)
  return {
    conversation: summary,
    messages: (messages ?? []).map((message) => ({
      id: message.id as string,
      conversation_id: message.conversation_id as string,
      sender_id: (message.sender_id as string | null) ?? null,
      type: message.type as MessageType,
      body: (message.body as string | null) ?? null,
      metadata: (message.metadata as Record<string, unknown> | null) ?? null,
      created_at: message.created_at as string,
    })),
  }
}

export async function sendConversationMessage(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  body: string
): Promise<Message | { response: ReturnType<typeof apiError> }> {
  const bodyError = validateMessageBody(body)
  if (bodyError) {
    return { response: apiError(422, ERROR_CODES.VALIDATION_FAILED, bodyError, { body: bodyError }) }
  }

  const { data: row, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    console.error('[messages] load for send failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  if (!row || !isParticipant(row as ConversationRow, userId)) {
    return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Razgovor nije pronađen.') }
  }

  const trimmed = body.trim()
  const { data, error: sendError } = await supabase.rpc('snd_send_text_message', {
    p_conversation_id: conversationId,
    p_body: trimmed,
  })

  if (sendError) {
    const message = sendError.message ?? ''
    if (message.includes('UNAUTHENTICATED')) {
      return { response: apiError(401, ERROR_CODES.UNAUTHENTICATED, 'Prijavi se da nastaviš.') }
    }
    if (message.includes('VALIDATION_FAILED')) {
      return { response: apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Napiši poruku.') }
    }
    if (message.includes('NOT_FOUND')) {
      return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Razgovor nije pronađen.') }
    }
    console.error('[messages] send rpc failed', sendError)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Poruka nije poslata. Pokušaj ponovo.') }
  }

  const message = data as {
    id: string
    conversation_id: string
    sender_id: string | null
    type: MessageType
    body: string | null
    metadata: Record<string, unknown> | null
    created_at: string
  }

  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    type: message.type,
    body: message.body,
    metadata: message.metadata,
    created_at: message.created_at,
  }
}

export async function markConversationRead(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string
): Promise<{ ok: true } | { response: ReturnType<typeof apiError> }> {
  const { data: row, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    console.error('[messages] load for read failed', error)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  if (!row || !isParticipant(row as ConversationRow, userId)) {
    return { response: apiError(404, ERROR_CODES.NOT_FOUND, 'Razgovor nije pronađen.') }
  }

  const conversation = row as ConversationRow
  const patch =
    conversation.renter_id === userId ? { renter_unread_count: 0 } : { owner_unread_count: 0 }

  const { error: updateError } = await supabase.from('conversations').update(patch).eq('id', conversationId)
  if (updateError) {
    console.error('[messages] mark read failed', updateError)
    return { response: apiError(500, ERROR_CODES.INTERNAL, 'Nešto je krenulo naopako.') }
  }

  return { ok: true }
}
