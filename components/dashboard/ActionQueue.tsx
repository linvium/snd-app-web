import Link from 'next/link'
import {
  CircleAlertIcon,
  ClockIcon,
  FileTextIcon,
  ImageIcon,
  MessageSquareIcon,
  type LucideIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ActionKind, ActionTone, DashboardAction } from '@/types'

const KIND_ICONS: Record<ActionKind, LucideIcon> = {
  request: ClockIcon,
  unread: MessageSquareIcon,
  draft: FileTextIcon,
}

const TONE_STRIP: Record<ActionTone, string> = {
  urgent: 'bg-destructive',
  attention: 'bg-warning',
  calm: 'bg-brand-400',
}

const TONE_ICON: Record<ActionTone, string> = {
  urgent: 'bg-red-50 text-destructive',
  attention: 'bg-warning-soft text-amber-700',
  calm: 'bg-brand-50 text-brand-600',
}

function ActionRow({ action }: { action: DashboardAction }) {
  const Icon = action.tone === 'urgent' ? CircleAlertIcon : KIND_ICONS[action.kind]

  return (
    <li
      data-testid="action-row"
      data-tone={action.tone}
      className="flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <span aria-hidden className={cn('w-[5px] shrink-0 self-stretch', TONE_STRIP[action.tone])} />
      <span
        aria-hidden
        className={cn('grid size-9 shrink-0 place-items-center rounded-lg', TONE_ICON[action.tone])}
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>

      {action.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={action.thumbnail_url}
          alt=""
          className="hidden size-9 shrink-0 rounded-lg object-cover sm:block"
        />
      ) : action.kind === 'draft' ? (
        <span aria-hidden className="hidden size-9 shrink-0 place-items-center rounded-lg bg-muted sm:grid">
          <ImageIcon className="size-4 text-muted-foreground" strokeWidth={1.6} />
        </span>
      ) : null}

      <div className="min-w-0 flex-1 py-3">
        <p className="m-0 truncate text-sm font-semibold text-card-foreground">{action.title}</p>
        <p className="mt-0.5 mb-0 truncate text-[12.5px] text-muted-foreground">{action.detail}</p>
      </div>

      <div className="shrink-0 pr-3">
        <Button size="sm" variant={action.tone === 'calm' ? 'secondary' : 'default'} asChild>
          <Link href={action.href}>{action.cta}</Link>
        </Button>
      </div>
    </li>
  )
}

/**
 * The one list on the page that is about doing something rather than knowing
 * something - pending requests, unanswered messages and unfinished drafts,
 * worst first.
 */
export function ActionQueue({ actions }: { actions: DashboardAction[] }) {
  if (actions.length === 0) {
    return (
      <section
        data-testid="action-queue-empty"
        className="rounded-xl border border-border bg-card px-5 py-7 text-center"
      >
        <p className="m-0 text-[15px] font-semibold text-foreground">Sve je čisto.</p>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">
          Nema zahteva ni poruka koje čekaju tvoj odgovor.
        </p>
      </section>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="action-queue">
      {actions.map((action) => (
        <ActionRow key={action.id} action={action} />
      ))}
    </ul>
  )
}
