'use client'

import { useEffect, useState } from 'react'
import { BanIcon, EllipsisVerticalIcon } from 'lucide-react'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { useDeleteMessage, useEditMessage } from '@/hooks/messages'
import {
  MESSAGE_MUTATION_WINDOW_EXPIRED,
  MESSAGE_MUTATION_WINDOW_MS,
  canMutateTextMessage,
  formatMessageClock,
  isOwnTextMessage,
  shouldSubmitComposerOnEnter,
  visibleMessageBody,
} from '@/lib/messages'
import { ApiError } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/message'

function useMutationWindowOpen(message: Message, userId: string | null | undefined) {
  const [now, setNow] = useState(() => new Date())
  const open = canMutateTextMessage({ message, userId, now })

  useEffect(() => {
    if (!open) return
    const created = Date.parse(message.created_at)
    if (Number.isNaN(created)) return
    const remaining = created + MESSAGE_MUTATION_WINDOW_MS - Date.now()
    const timer = window.setTimeout(() => setNow(new Date()), Math.max(remaining, 0) + 50)
    return () => window.clearTimeout(timer)
  }, [open, message.created_at])

  return open
}

export function TextMessageBubble({
  conversationId,
  message,
  mine,
  userId,
}: {
  conversationId: string
  message: Message
  mine: boolean
  userId: string | null | undefined
}) {
  const editMessage = useEditMessage(conversationId)
  const deleteMessage = useDeleteMessage(conversationId)
  const canMutate = useMutationWindowOpen(message, userId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.body ?? '')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleted = Boolean(message.deleted_at)
  const body = visibleMessageBody(message)
  const clock = formatMessageClock(message.created_at)
  // Hidden until we ship edit/delete in the thread UI.
  const showActions = false && isOwnTextMessage({ message, userId }) && !editing

  const rejectExpiredWindow = () => {
    toast(MESSAGE_MUTATION_WINDOW_EXPIRED, {
      classNames: {
        title: 'text-[12px] font-normal leading-snug',
      },
    })
  }

  const startEdit = () => {
    if (!canMutate) {
      rejectExpiredWindow()
      return
    }
    setError(null)
    setDraft(message.body ?? '')
    setEditing(true)
  }

  const cancelEdit = () => {
    setError(null)
    setEditing(false)
    setDraft(message.body ?? '')
  }

  const saveEdit = () => {
    if (!draft.trim()) {
      setError('Napiši poruku.')
      return
    }
    if (!canMutate) {
      setEditing(false)
      rejectExpiredWindow()
      return
    }
    setError(null)
    setEditing(false)
    editMessage.mutate(
      { messageId: message.id, body: draft },
      {
        onError: (saveError) => {
          setEditing(true)
          setError(saveError instanceof ApiError ? saveError.message : 'Poruka nije izmenjena.')
        },
      }
    )
  }

  const requestDelete = () => {
    if (!canMutate) {
      rejectExpiredWindow()
      return
    }
    setError(null)
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!canMutate) {
      setDeleteOpen(false)
      rejectExpiredWindow()
      return
    }
    setError(null)
    setDeleteOpen(false)
    deleteMessage.mutate(message.id, {
      onError: (deleteError) => {
        setError(deleteError instanceof ApiError ? deleteError.message : 'Poruka nije obrisana.')
      },
    })
  }

  if (editing) {
    return (
      <div data-testid="text-message" className="flex justify-end">
        <form
          className="w-full max-w-[80%] rounded-2xl rounded-br-sm border border-border bg-card p-2 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault()
            if (editMessage.isPending) return
            saveEdit()
          }}
        >
          <Textarea
            data-testid="message-edit-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (!shouldSubmitComposerOnEnter(event)) return
              event.preventDefault()
              if (editMessage.isPending) return
              saveEdit()
            }}
            rows={3}
            maxLength={2000}
            className="min-h-16 resize-none"
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="message-edit-cancel"
              disabled={editMessage.isPending}
              onClick={cancelEdit}
            >
              Otkaži
            </Button>
            <Button
              type="submit"
              size="sm"
              data-testid="message-edit-save"
              className="bg-brand-500 hover:bg-brand-600"
            >
              Sačuvaj
            </Button>
          </div>
          {error ? (
            <p className="mt-1.5 mb-0 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    )
  }

  return (
    <div className={mine ? 'flex flex-col items-end' : undefined}>
      <div
        data-testid="text-message"
        className={mine ? 'flex w-full items-start justify-end gap-0' : 'flex justify-start'}
      >
        <div
          className={cn(
            'min-w-0 max-w-[80%] rounded-2xl px-3.5 py-2',
            deleted ? 'text-[12px] leading-4' : 'text-sm leading-5',
            deleted
              ? cn(
                  'border border-border bg-muted text-muted-foreground',
                  mine ? 'rounded-br-sm' : 'rounded-bl-sm'
                )
              : mine
                ? 'rounded-br-sm bg-brand-500 text-white'
                : 'rounded-bl-sm border border-border bg-card text-card-foreground shadow-sm'
          )}
        >
          <p
            className="m-0 flex items-center gap-1.5"
            data-testid={deleted ? 'deleted-message' : undefined}
          >
            {deleted ? (
              <BanIcon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
            ) : null}
            <span className={cn('break-words whitespace-pre-wrap', deleted && 'italic')}>{body}</span>
          </p>
          {clock ? (
            <time
              dateTime={message.created_at}
              data-testid="message-time"
              className={cn(
                'mt-1 mb-0 block text-right text-[10px] leading-4',
                mine && !deleted ? 'text-white/75' : 'text-muted-foreground'
              )}
            >
              {message.edited_at && !deleted ? (
                <span data-testid="message-edited">izmenjeno · </span>
              ) : null}
              {clock}
            </time>
          ) : null}
        </div>

        {showActions ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-testid="message-actions"
                aria-label="Akcije poruke"
                className="mt-0.5 grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-muted-foreground"
              >
                <EllipsisVerticalIcon className="size-4" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-36">
              <DropdownMenuItem data-testid="message-edit" onSelect={startEdit}>
                Izmeni
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                data-testid="message-delete"
                onSelect={requestDelete}
              >
                Obriši
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {error && !editing ? (
        <p className="mt-1 mb-0 text-sm text-destructive" role="alert" data-testid="message-action-error">
          {error}
        </p>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obrisati poruku?</DialogTitle>
            <DialogDescription>
              Poruka će ostati u razgovoru kao &quot;Poruka je obrisana&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Otkaži
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="message-delete-confirm"
              loading={deleteMessage.isPending}
              onClick={confirmDelete}
            >
              Obriši
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
