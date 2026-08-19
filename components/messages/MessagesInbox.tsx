'use client'

import Link from 'next/link'
import { ImageIcon, MessageSquareIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useConversations } from '@/hooks/messages'
import { formatConversationTime, requestThreadPath, sortConversationsForInbox } from '@/lib/messages'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name.slice(0, 1).toUpperCase()
}

function InboxSkeleton() {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-hidden data-testid="messages-inbox-skeleton">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="flex gap-3 rounded-xl border border-border bg-card p-3">
          <Skeleton className="size-16 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 py-0.5">
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="mb-2 h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function MessagesInbox() {
  const conversations = useConversations()

  if (conversations.isPending || (conversations.isFetching && conversations.data === undefined)) {
    return <InboxSkeleton />
  }

  if (conversations.isError) {
    return (
      <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
        <p className="m-0 text-sm text-destructive">Nismo mogli da učitamo poruke.</p>
      </section>
    )
  }

  const items = sortConversationsForInbox(conversations.data ?? [])
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
        <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
          <MessageSquareIcon className="size-5" strokeWidth={1.8} aria-hidden />
        </span>
        <p className="mb-1 text-base font-semibold text-foreground" data-testid="messages-empty">
          Još nemaš zahteva.
        </p>
        <p className="m-0 text-sm text-muted-foreground">
          Kad pošalješ ili primiš zahtev za iznajmljivanje, pojaviće se ovde.
        </p>
      </section>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0" data-testid="messages-list">
      {items.map((conversation) => {
        const unread = conversation.unread_count > 0

        return (
          <li key={conversation.id}>
            <Link
              href={requestThreadPath(conversation.id)}
              data-testid="conversation-row"
              data-conversation-id={conversation.id}
              className={cn(
                'flex gap-3 rounded-xl border bg-card p-3 no-underline shadow-sm transition-all duration-150',
                'hover:-translate-y-px hover:shadow-md',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                unread
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-border text-inherit hover:border-brand-200'
              )}
            >
              <div className="relative size-16 shrink-0">
                <div className="grid size-16 place-items-center overflow-hidden rounded-lg bg-zinc-100">
                  {conversation.listing.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conversation.listing.thumbnail_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-7 text-zinc-300" strokeWidth={1.5} aria-hidden />
                  )}
                </div>
                <Avatar
                  size="sm"
                  className="absolute -right-1 -bottom-1 ring-2 ring-card"
                >
                  {conversation.other_party.avatar_url ? (
                    <AvatarImage src={conversation.other_party.avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback className="bg-brand-500 text-[10px] font-semibold text-white">
                    {initials(conversation.other_party.display_name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p
                  className={cn(
                    'm-0 truncate text-[15px] leading-snug text-card-foreground',
                    unread ? 'font-semibold' : 'font-medium'
                  )}
                >
                  {conversation.listing.title}
                </p>
                <p className="mt-0.5 mb-0 truncate text-sm text-muted-foreground">
                  {conversation.other_party.display_name}
                </p>
                <p
                  className={cn(
                    'mt-1 mb-0 truncate text-sm',
                    unread ? 'font-medium text-card-foreground' : 'text-muted-foreground'
                  )}
                >
                  {conversation.last_message_preview ?? ''}
                </p>
              </div>

              <div className="flex min-h-16 shrink-0 flex-col items-end">
                {conversation.last_message_at ? (
                  <time
                    className={cn(
                      'text-[12px] leading-4',
                      unread ? 'font-semibold text-brand-600' : 'text-muted-foreground'
                    )}
                  >
                    {formatConversationTime(conversation.last_message_at)}
                  </time>
                ) : null}
                {unread ? (
                  <span
                    data-testid="conversation-unread"
                    className="mt-auto mb-auto grid h-7 min-w-7 place-items-center rounded-full bg-brand-500 px-1.5 text-[12px] font-semibold text-white"
                  >
                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
