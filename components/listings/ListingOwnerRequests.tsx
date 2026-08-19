'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useAuthSession } from '@/context/AuthContext'
import { useListingConversations } from '@/hooks/messages'
import { requestThreadPath } from '@/lib/messages'

export function ListingOwnerRequests({ listingId }: { listingId: string }) {
  const { user } = useAuthSession()
  const conversations = useListingConversations(listingId, Boolean(user))
  const items = conversations.data

  if (!user || conversations.isLoading || items.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5" data-testid="owner-listing-requests">
      <p className="mt-0 mb-3 text-sm font-medium text-card-foreground">Zahtevi</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((conversation) => (
          <li key={conversation.id}>
            <Button fullWidth className="bg-brand-500 hover:bg-brand-600" asChild>
              <Link href={requestThreadPath(conversation.id)} data-testid="open-conversation-button">
                {conversation.unread_count > 0
                  ? `Otvori zahtev (${conversation.unread_count})`
                  : `Razgovor sa ${conversation.other_party.display_name}`}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
