'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDaysIcon, ChevronLeftIcon, ImageIcon, SendIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuthSession } from '@/context/AuthContext'
import { useConversation, useMarkConversationRead, useSendMessage } from '@/hooks/messages'
import {
  formatMessageClock,
  formatMessageDayLabel,
  messageDayKey,
  messagePresentation,
  REQUESTS_PATH,
  requestCardDatesLabel,
} from '@/lib/messages'
import { ApiError } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/message'

function initials(name: string) {
  const source = name.includes('@') ? name.split('@')[0] : name
  return (source.slice(0, 1) || '?').toUpperCase()
}

const THREAD_FRAME =
  'flex h-[calc(100svh-12.5rem)] max-h-[calc(100svh-12.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm md:h-[calc(100svh-10.5rem)] md:max-h-[calc(100svh-10.5rem)]'

function RequestCard({ message }: { message: Message }) {
  const metadata = message.metadata ?? {}
  const startDate = typeof metadata.start_date === 'string' ? metadata.start_date : null
  const endDate = typeof metadata.end_date === 'string' ? metadata.end_date : null

  return (
    <div
      data-testid="request-card"
      className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm"
    >
      <p className="m-0 flex items-center gap-2 font-medium text-card-foreground">
        <CalendarDaysIcon className="size-4 shrink-0 text-brand-600" aria-hidden />
        Zahtev za iznajmljivanje
      </p>
      <p className="mt-1 mb-0 pl-6 text-muted-foreground">{requestCardDatesLabel(startDate, endDate)}</p>
    </div>
  )
}

function ThreadSkeleton() {
  return (
    <div
      className={THREAD_FRAME}
      data-testid="message-thread"
      aria-busy="true"
      aria-label="Učitavanje razgovora"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <Skeleton className="size-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-4 w-40" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </header>
      <div className="snd-thin-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-muted/40 px-4 py-4">
        <Skeleton className="h-16 w-full max-w-md rounded-xl" />
        <Skeleton className="h-10 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="h-10 w-1/2 rounded-2xl" />
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
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
  const listRef = useRef<HTMLOListElement>(null)
  const lastMessageId = thread.data?.messages.at(-1)?.id

  useEffect(() => {
    if (thread.data) markRead.mutate(conversationId)
    // Mark once when the thread first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, thread.data?.conversation.id])

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

  if (thread.isLoading) {
    return <ThreadSkeleton />
  }

  if (thread.isError || !thread.data) {
    return (
      <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
        <p className="m-0 text-sm text-destructive">Razgovor nije pronađen.</p>
      </section>
    )
  }

  const { conversation, messages } = thread.data
  const listingHref = conversation.listing.slug ? `/listings/${conversation.listing.slug}` : undefined
  const partyName = conversation.other_party.display_name

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
    <div
      className={THREAD_FRAME}
      data-testid="message-thread"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-3 sm:px-4">
        <Link
          href={REQUESTS_PATH}
          data-testid="thread-back"
          aria-label="Nazad na zahteve"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground no-underline hover:bg-muted hover:text-foreground"
        >
          <ChevronLeftIcon className="size-5" aria-hidden />
        </Link>
        <div className="relative size-12 shrink-0">
          <div className="grid size-12 place-items-center overflow-hidden rounded-lg bg-zinc-100">
            {conversation.listing.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.listing.thumbnail_url}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon className="size-5 text-zinc-300" strokeWidth={1.5} aria-hidden />
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Avatar size="sm" className="hidden sm:flex">
              {conversation.other_party.avatar_url ? (
                <AvatarImage src={conversation.other_party.avatar_url} alt="" />
              ) : null}
              <AvatarFallback className="bg-brand-500 text-[10px] font-semibold text-white">
                {initials(partyName)}
              </AvatarFallback>
            </Avatar>
            <p
              className="m-0 truncate text-[15px] font-semibold text-card-foreground"
              data-testid="thread-party-name"
            >
              {partyName}
            </p>
          </div>
          {listingHref ? (
            <Link
              href={listingHref}
              className="mt-0.5 block truncate text-sm text-muted-foreground no-underline hover:text-foreground"
            >
              {conversation.listing.title}
            </Link>
          ) : (
            <p className="mt-0.5 mb-0 truncate text-sm text-muted-foreground">{conversation.listing.title}</p>
          )}
        </div>
      </header>

      <ol
        ref={listRef}
        className="snd-thin-scroll m-0 flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto bg-muted/40 p-4"
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
            <li key={message.id} className="flex flex-col gap-3">
              {showDay ? (
                <p className="m-0 self-center rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                  {formatMessageDayLabel(message.created_at)}
                </p>
              ) : null}
              {presentation === 'request_card' ? (
                <RequestCard message={message} />
              ) : (
                <div
                  data-testid="text-message"
                  className={mine ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                      mine
                        ? 'bg-brand-500 text-white'
                        : 'border border-border bg-card text-card-foreground shadow-sm'
                    )}
                  >
                    <p className="m-0 whitespace-pre-wrap break-words">{message.body}</p>
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

      <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-3 py-3 sm:px-4">
        <Textarea
          data-testid="thread-message-input"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Napiši poruku…"
          className="min-h-11 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          data-testid="thread-send"
          disabled={sendMessage.isPending}
          className="rounded-full bg-brand-500 hover:bg-brand-600"
          aria-label="Pošalji"
        >
          <SendIcon className="size-4" aria-hidden />
        </Button>
      </form>
      {error ? (
        <p className="mt-0 mb-3 px-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
