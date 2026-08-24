'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { MessagesInbox } from '@/components/messages/MessagesInbox'
import { isRequestThreadPath } from '@/lib/profiles'
import { cn } from '@/lib/utils'

/**
 * Two panes on desktop, one screen at a time on a phone.
 *
 * The list is mounted on both routes so opening a conversation on a wide screen
 * does not throw away the inbox — and on a phone exactly one of the two is on
 * screen, because a 390px column cannot hold both.
 */
export function RequestsWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const threadOpen = isRequestThreadPath(pathname)

  return (
    <div className="flex min-h-0 lg:h-full" data-testid="requests-workspace">
      <section
        className={cn(
          'flex min-h-0 w-full flex-col border-border bg-card lg:w-[344px] lg:shrink-0 lg:border-r',
          threadOpen && 'hidden lg:flex'
        )}
      >
        <MessagesInbox />
      </section>

      <section
        className={cn(
          'min-w-0 flex-1 flex-col bg-background',
          threadOpen ? 'flex' : 'hidden lg:flex'
        )}
      >
        {children}
      </section>
    </div>
  )
}
