'use client'

import Link from 'next/link'
import { ImageIcon, MessageSquareIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useConversations } from '@/hooks/messages'
import {
  REQUESTS_PATH,
  formatConversationTime,
  requestThreadPath,
  sortConversationsForInbox,
} from '@/lib/messages'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const source = name.includes('@') ? name.split('@')[0] : name
  return (source.slice(0, 1) || '?').toUpperCase()
}

/**
 * The four most recent conversations, live off the same polled query the inbox
 * uses — so the dashboard never disagrees with /profile/requests.
 */
export function RecentMessages({ limit = 4 }: { limit?: number }) {
  const conversations = useConversations()
  const items = sortConversationsForInbox(conversations.data ?? []).slice(0, limit)
  const unreadTotal = (conversations.data ?? []).reduce((sum, row) => sum + row.unread_count, 0)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <h2 className="m-0 flex-1 text-[14.5px] font-semibold tracking-[-0.015em] text-card-foreground">
          Najnovije poruke
        </h2>
        <Link href={REQUESTS_PATH} className="text-[12.5px] font-semibold text-brand-600">
          {unreadTotal > 0 ? `Otvori sve (${unreadTotal} novih)` : 'Otvori sve'}
        </Link>
      </header>

      {conversations.isPending ? (
        <ul className="m-0 list-none p-0" aria-hidden data-testid="recent-messages-skeleton">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-2 h-3.5 w-1/2" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            </li>
          ))}
        </ul>
      ) : conversations.isError ? (
        <p className="m-0 px-5 py-7 text-center text-sm text-destructive">
          Nismo mogli da učitamo poruke.
        </p>
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <span
            aria-hidden
            className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600"
          >
            <MessageSquareIcon className="size-5" strokeWidth={1.8} />
          </span>
          <p className="m-0 text-[15px] font-semibold text-foreground">Još nemaš zahteva.</p>
          <p className="mt-1 mb-0 text-sm text-muted-foreground">
            Kad pošalješ ili primiš zahtev, razgovor se pojavi ovde.
          </p>
        </div>
      ) : (
        <ul className="m-0 list-none p-0" data-testid="recent-messages">
          {items.map((conversation) => {
            const unread = conversation.unread_count > 0

            return (
              <li key={conversation.id} className="border-b border-border last:border-b-0">
                <Link
                  href={requestThreadPath(conversation.id)}
                  className="flex items-start gap-3 px-4 py-3 no-underline hover:bg-muted/50"
                >
                  <span className="relative shrink-0">
                    <Avatar className="size-9">
                      {conversation.other_party.avatar_url ? (
                        <AvatarImage src={conversation.other_party.avatar_url} alt="" />
                      ) : null}
                      <AvatarFallback className="bg-brand-500 text-[11px] font-semibold text-white">
                        {initials(conversation.other_party.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      aria-hidden
                      className="absolute -right-1 -bottom-1 grid size-5 place-items-center overflow-hidden rounded-md bg-muted ring-2 ring-card"
                    >
                      {conversation.listing.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={conversation.listing.thumbnail_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-3 text-muted-foreground" strokeWidth={1.6} />
                      )}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold text-card-foreground">
                        {conversation.other_party.display_name}
                      </span>
                      <span className="hidden truncate text-[11.5px] text-muted-foreground sm:inline">
                        · {conversation.listing.title}
                      </span>
                      <time className="ml-auto shrink-0 text-[11.5px] text-muted-foreground">
                        {formatConversationTime(conversation.last_message_at)}
                      </time>
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block truncate text-[13px]',
                        unread ? 'font-semibold text-card-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {conversation.last_message_preview ?? 'Novi razgovor'}
                    </span>
                  </span>

                  {unread ? (
                    <span
                      aria-label={`${conversation.unread_count} nepročitanih`}
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500"
                    />
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
