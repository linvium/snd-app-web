'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BadgeCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ImageIcon,
  SendIcon,
  StarIcon,
  XIcon,
} from 'lucide-react'

import { BookingTicket } from '@/components/messages/BookingTicket'
import { ThreadDetailPanel } from '@/components/messages/ThreadDetailPanel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuthSession } from '@/context/AuthContext'
import { useConversation, useMarkConversationRead, useSendMessage } from '@/hooks/messages'
import { formatRating, pluralizeRatings, responseTimeText } from '@/lib/listings/listings.detail'
import {
  QUICK_REPLIES,
  REQUESTS_PATH,
  formatMessageClock,
  formatMessageDayLabel,
  messageDayKey,
  messagePresentation,
  shouldSubmitComposerOnEnter,
} from '@/lib/messages'
import { ApiError } from '@/lib/search'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const source = name.includes('@') ? name.split('@')[0] : name
  return (source.slice(0, 1) || '?').toUpperCase()
}

/**
 * Full viewport on a phone — the app chrome is hidden on this route, so the
 * composer sits on the bottom edge. Inside the desktop workspace the pane just
 * fills whatever height the shell gives it.
 */
const THREAD_FRAME = 'flex h-[100svh] min-h-0 flex-col bg-background lg:h-full'

function ThreadSkeleton() {
  return (
    <div className={THREAD_FRAME} data-testid="message-thread" aria-busy="true" aria-label="Učitavanje razgovora">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2.5">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </header>
      <div className="snd-thin-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <Skeleton className="h-24 w-full max-w-md rounded-2xl" />
        <Skeleton className="h-10 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-3">
        <Skeleton className="h-11 flex-1 rounded-md" />
        <Skeleton className="size-11 shrink-0 rounded-full" />
      </div>
    </div>
  )
}

export function MessageThread({ conversationId }: { conversationId: string }) {
  const router = useRouter()
  const { user } = useAuthSession()
  const thread = useConversation(conversationId)
  const sendMessage = useSendMessage(conversationId)
  const markRead = useMarkConversationRead()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageId = thread.data?.messages.at(-1)?.id

  useEffect(() => {
    if (thread.data) markRead.mutate(conversationId)
    // Mark when the thread is on screen, including after a new inbound message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, thread.data?.conversation.id, lastMessageId])

  useEffect(() => {
    if (thread.error instanceof ApiError && thread.error.status === 404) {
      router.replace(REQUESTS_PATH)
    }
  }, [thread.error, router])

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [conversationId, lastMessageId, thread.data?.messages.length])

  if (thread.isPending || (thread.isFetching && thread.data === undefined)) {
    return <ThreadSkeleton />
  }

  if (thread.isError || !thread.data) {
    return (
      <section className="m-4 rounded-xl border border-border bg-card px-5 py-8 text-center">
        <p className="m-0 text-sm text-destructive">Razgovor nije pronađen.</p>
      </section>
    )
  }

  const { conversation, messages } = thread.data
  const { listing, other_party: party, booking } = conversation
  const listingHref = listing.slug ? `/listings/${listing.slug}` : undefined
  const partyName = party.display_name
  const responseText = responseTimeText(party)
  const ratingText = formatRating(party.rating_avg)
  const awaitingOwner = conversation.viewer_role === 'owner' && booking?.status === 'requested'

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!body.trim()) {
      setError('Napiši poruku.')
      return
    }
    setError(null)
    sendMessage.mutate(body, {
      onSuccess: () => setBody(''),
      onError: (sendError) => {
        setError(sendError instanceof ApiError ? sendError.message : 'Poruka nije poslata.')
      },
    })
  }

  return (
    <div className="flex min-h-0 lg:h-full">
      <div className={cn(THREAD_FRAME, 'min-w-0 flex-1')} data-testid="message-thread">
        <header className="flex shrink-0 items-center gap-2.5 border-b border-border bg-card px-2 py-2.5 sm:px-3">
          <Link
            href={REQUESTS_PATH}
            data-testid="thread-back"
            aria-label="Nazad na zahteve"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground no-underline hover:bg-muted hover:text-foreground lg:hidden"
          >
            <ChevronLeftIcon className="size-5" aria-hidden />
          </Link>

          <Avatar className="size-9 shrink-0">
            {party.avatar_url ? <AvatarImage src={party.avatar_url} alt="" /> : null}
            <AvatarFallback className="bg-brand-500 text-[12px] font-semibold text-white">
              {initials(partyName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p
              className="m-0 flex items-center gap-1.5 truncate text-[15px] font-semibold text-card-foreground"
              data-testid="thread-party-name"
            >
              {partyName}
              {party.is_verified ? (
                <BadgeCheckIcon
                  className="size-4 shrink-0 text-brand-500"
                  strokeWidth={2}
                  aria-label="Identitet potvrđen"
                />
              ) : null}
            </p>
            <p className="mt-0.5 mb-0 flex items-center gap-1.5 truncate text-[11.5px] text-muted-foreground">
              {ratingText ? (
                <span className="inline-flex shrink-0 items-center gap-0.5">
                  <StarIcon className="size-3 fill-current" aria-hidden />
                  {ratingText}
                  {party.rating_count > 0 ? ` (${pluralizeRatings(party.rating_count)})` : null}
                </span>
              ) : (
                <span className="shrink-0">Bez ocena</span>
              )}
              {responseText ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">{responseText}</span>
                </>
              ) : null}
            </p>
          </div>

          {listingHref ? (
            <Button variant="secondary" size="sm" asChild className="hidden shrink-0 sm:inline-flex">
              <Link href={listingHref}>Vidi oglas</Link>
            </Button>
          ) : null}
          {booking ? (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              data-testid="thread-details-button"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground xl:hidden"
              aria-label="Detalji rezervacije"
            >
              <ClockIcon className="size-[18px]" strokeWidth={1.9} aria-hidden />
            </button>
          ) : null}
        </header>

        <Link
          href={listingHref ?? REQUESTS_PATH}
          className="flex shrink-0 items-center gap-2.5 border-b border-border bg-card px-3 py-2 no-underline xl:hidden"
        >
          {listing.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.thumbnail_url} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
          ) : (
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
              <ImageIcon className="size-4 text-muted-foreground" strokeWidth={1.6} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-card-foreground">
            {listing.title}
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>

        {awaitingOwner ? (
          <div className="flex shrink-0 items-center gap-2.5 border-b border-warning/40 bg-warning-soft px-3 py-2.5">
            <ClockIcon className="size-4 shrink-0 text-amber-700" strokeWidth={2} aria-hidden />
            <p className="m-0 flex-1 text-[12.5px] leading-snug text-amber-900">
              <span className="block font-semibold">Zahtev čeka tvoj odgovor</span>
              Odgovori u razgovoru i dogovorite preuzimanje.
            </p>
          </div>
        ) : null}

        <ol
          ref={listRef}
          className="snd-thin-scroll m-0 flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto p-4"
          data-testid="message-list"
        >
          <li className="min-h-0 flex-1" aria-hidden />
          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const showDay =
              !previous || messageDayKey(previous.created_at) !== messageDayKey(message.created_at)
            const presentation = messagePresentation(message)
            const mine = Boolean(user?.id && message.sender_id === user.id)
            const clock = formatMessageClock(message.created_at)

            return (
              <li key={message.id} className="mx-auto flex w-full max-w-[720px] flex-col gap-3">
                {showDay ? (
                  <p className="m-0 self-center rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                    {formatMessageDayLabel(message.created_at)}
                  </p>
                ) : null}

                {presentation === 'request_card' ? (
                  booking ? (
                    <BookingTicket
                      booking={booking}
                      listing={listing}
                      role={conversation.viewer_role}
                      partyName={partyName}
                    />
                  ) : null
                ) : (
                  <div
                    data-testid="text-message"
                    className={mine ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                        mine
                          ? 'rounded-br-sm bg-brand-500 text-white'
                          : 'rounded-bl-sm border border-border bg-card text-card-foreground shadow-sm'
                      )}
                    >
                      <p className="m-0 break-words whitespace-pre-wrap">{message.body}</p>
                      {clock ? (
                        <time
                          dateTime={message.created_at}
                          data-testid="message-time"
                          className={cn(
                            'mt-1 mb-0 block text-right text-[10px] leading-4',
                            mine ? 'text-white/75' : 'text-muted-foreground'
                          )}
                        >
                          {clock}
                        </time>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-border bg-card px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4 lg:pb-3"
        >
          <div className="mx-auto w-full max-w-[720px]">
            {body.trim().length === 0 ? (
              <div className="snd-thin-scroll mb-2 flex gap-2 overflow-x-auto pb-1">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    data-testid="quick-reply"
                    onClick={() => {
                      setBody(reply)
                      inputRef.current?.focus()
                    }}
                    className="shrink-0 cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                data-testid="thread-message-input"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (!shouldSubmitComposerOnEnter(event)) return
                  event.preventDefault()
                  if (sendMessage.isPending) return
                  event.currentTarget.form?.requestSubmit()
                }}
                rows={1}
                maxLength={2000}
                placeholder={`Napiši poruku (${partyName})…`}
                className="max-h-32 min-h-11 resize-none"
              />
              <Button
                type="submit"
                size="icon"
                data-testid="thread-send"
                disabled={sendMessage.isPending}
                className="shrink-0 rounded-full bg-brand-500 hover:bg-brand-600"
                aria-label="Pošalji"
              >
                <SendIcon className="size-4" aria-hidden />
              </Button>
            </div>

            <p
              className="mt-1.5 mb-0 text-[11px] leading-4 text-muted-foreground"
              data-testid="composer-hint"
            >
              Enter šalje poruku. Shift + Enter novi red.
            </p>
            {error ? (
              <p className="mt-1 mb-0 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </div>

      <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-l border-border bg-card xl:block">
        <ThreadDetailPanel conversation={conversation} />
      </aside>

      {detailsOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end xl:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Zatvori detalje"
            onClick={() => setDetailsOpen(false)}
            className="absolute inset-0 cursor-pointer border-0 bg-black/40"
          />
          <div className="relative max-h-[82%] overflow-y-auto rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] shadow-lg">
            <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-card px-4 py-3">
              <p className="m-0 flex-1 text-[15px] font-semibold text-card-foreground">
                Detalji rezervacije
              </p>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                aria-label="Zatvori"
                className="grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted-foreground hover:bg-muted"
              >
                <XIcon className="size-4" aria-hidden />
              </button>
            </div>
            <ThreadDetailPanel conversation={conversation} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
