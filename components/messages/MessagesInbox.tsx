'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ImageIcon, MessageSquareIcon, SearchIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useConversations } from '@/hooks/messages'
import {
  CONVERSATION_TABS,
  bookingStatusPill,
  conversationTabCounts,
  filterConversations,
  formatConversationTime,
  requestThreadPath,
  sortConversationsForInbox,
  type BookingPillTone,
  type ConversationTab,
} from '@/lib/messages'
import { cn } from '@/lib/utils'

const PILL_TONE: Record<BookingPillTone, string> = {
  wait: 'bg-warning-soft text-amber-700',
  ok: 'bg-brand-50 text-brand-600',
  done: 'bg-muted text-muted-foreground',
  late: 'bg-red-50 text-destructive',
}

function initials(name: string) {
  const source = name.includes('@') ? name.split('@')[0] : name
  return (source.slice(0, 1) || '?').toUpperCase()
}

function InboxSkeleton() {
  return (
    <ul
      className="m-0 flex list-none flex-col gap-1 p-2"
      aria-hidden
      data-testid="messages-inbox-skeleton"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex gap-3 rounded-xl p-3">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 py-0.5">
            <Skeleton className="mb-2 h-3.5 w-2/3" />
            <Skeleton className="mb-2 h-3 w-1/3" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * The conversation list. On desktop it is the left pane of the workspace and
 * keeps the open thread highlighted; on a phone it is the whole screen and each
 * row navigates away to the thread.
 */
export function MessagesInbox() {
  const conversations = useConversations()
  const params = useParams<{ id?: string }>()
  const activeId = typeof params?.id === 'string' ? params.id : null
  const [tab, setTab] = useState<ConversationTab>('all')
  const [query, setQuery] = useState('')

  const all = sortConversationsForInbox(conversations.data ?? [])
  const counts = conversationTabCounts(all)
  const items = filterConversations(all, tab, query)
  const loading =
    conversations.isPending || (conversations.isFetching && conversations.data === undefined)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-4 pt-4 pb-3">
        <h1 className="mt-0 mb-3 text-[19px] font-normal tracking-[-0.02em] text-foreground">
          Zahtevi
        </h1>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-input bg-muted/60 px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Traži po imenu ili predmetu"
            aria-label="Traži razgovore"
            data-testid="inbox-search"
            className="w-full min-w-0 border-0 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="flex shrink-0 gap-1.5 border-b border-border px-3 py-2.5">
        {CONVERSATION_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            data-testid={`inbox-tab-${item.key}`}
            className={cn(
              'cursor-pointer rounded-full border-0 px-3 py-1.5 text-[13px] transition-colors',
              tab === item.key
                ? 'bg-card-foreground font-semibold text-card'
                : 'bg-transparent font-medium text-muted-foreground hover:bg-muted'
            )}
          >
            {item.label}
            {counts[item.key] > 0 ? (
              <span className="ml-1 opacity-60">{counts[item.key]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="snd-thin-scroll min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <InboxSkeleton />
        ) : conversations.isError ? (
          <p className="m-0 px-5 py-8 text-center text-sm text-destructive">
            Nismo mogli da učitamo poruke.
          </p>
        ) : all.length === 0 ? (
          <section className="px-5 py-10 text-center">
            <span
              aria-hidden
              className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600"
            >
              <MessageSquareIcon className="size-5" strokeWidth={1.8} />
            </span>
            <p className="mb-1 text-base font-semibold text-foreground" data-testid="messages-empty">
              Još nemaš zahteva.
            </p>
            <p className="m-0 text-sm text-muted-foreground">
              Kad pošalješ ili primiš zahtev za iznajmljivanje, pojaviće se ovde.
            </p>
          </section>
        ) : items.length === 0 ? (
          <p className="m-0 px-5 py-10 text-center text-sm text-muted-foreground">
            Nema razgovora za ovaj filter.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-2" data-testid="messages-list">
            {items.map((conversation) => {
              const unread = conversation.unread_count > 0
              const pill = bookingStatusPill(conversation.booking?.status)
              const isActive = conversation.id === activeId

              return (
                <li key={conversation.id}>
                  <Link
                    href={requestThreadPath(conversation.id)}
                    data-testid="conversation-row"
                    data-conversation-id={conversation.id}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-start gap-3 rounded-xl p-3 no-underline transition-colors',
                      isActive ? 'bg-brand-50' : 'hover:bg-muted/60'
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar className="size-11">
                        {conversation.other_party.avatar_url ? (
                          <AvatarImage src={conversation.other_party.avatar_url} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-brand-500 text-[13px] font-semibold text-white">
                          {initials(conversation.other_party.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        aria-hidden
                        className="absolute -right-1.5 -bottom-1.5 grid size-6 place-items-center overflow-hidden rounded-lg bg-muted ring-2 ring-card"
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
                        <time className="ml-auto shrink-0 text-[11.5px] text-muted-foreground">
                          {formatConversationTime(conversation.last_message_at)}
                        </time>
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                        {conversation.listing.title}
                      </span>
                      <span
                        className={cn(
                          'mt-1 block truncate text-[13px]',
                          unread ? 'font-semibold text-card-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {conversation.last_message_preview ?? 'Novi razgovor'}
                      </span>
                      {pill ? (
                        <span
                          className={cn(
                            'mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            PILL_TONE[pill.tone]
                          )}
                        >
                          {pill.label}
                        </span>
                      ) : null}
                    </span>

                    {unread ? (
                      <span
                        data-testid="conversation-unread"
                        className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] font-semibold text-white"
                      >
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
