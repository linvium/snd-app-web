'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { MessageSquareIcon } from 'lucide-react'

import HeaderSearch from '@/components/search/HeaderSearch'
import Logo from '@/components/ui/Logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthSession } from '@/context/AuthContext'
import { useSignOut } from '@/hooks/auth'
import { useUnreadMessageCount } from '@/hooks/messages'
import { HEADER_UTILITY_LINKS } from '@/lib/layout/header.helpers'
import { LISTING_NEW_PATH } from '@/lib/listings/listings.paths'
import { MANAGER_REQUESTS, MANAGER_SETTINGS } from '@/lib/profiles'
import { cn } from '@/lib/utils'

export const MANAGER_HEADER_HEIGHT_CLASS = 'h-16'

function getInitials(email?: string | null) {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

/**
 * The manager's own top bar.
 *
 * The public header stacks a utility row, a logo row and a full-height search
 * bar — three rows the manager cannot afford, because the workspace below it
 * needs the viewport. This is one 64px row, full bleed, so the rail underneath
 * starts at the left edge of the screen rather than inside a centred shell.
 */
export default function ManagerHeader({ hiddenOnMobile = false }: { hiddenOnMobile?: boolean } = {}) {
  const { user, loading } = useAuthSession()
  const signOut = useSignOut()
  const unread = useUnreadMessageCount(Boolean(user))

  return (
    <header
      data-testid="manager-header"
      className={cn(
        'sticky top-0 z-40 flex w-full shrink-0 items-center gap-3 border-b border-border bg-card px-3 lg:gap-5 lg:px-5',
        MANAGER_HEADER_HEIGHT_CLASS,
        hiddenOnMobile && 'max-lg:hidden'
      )}
    >
      <Link href="/" aria-label="SND početna" className="shrink-0">
        <Logo size="sm" variant="symbol" />
      </Link>

      <div className="min-w-0 flex-1 md:max-w-[420px]">
        {/* useSearchParams needs a boundary; the bar is not worth blocking on. */}
        <Suspense fallback={<div className="h-10" />}>
          <HeaderSearch compact />
        </Suspense>
      </div>

      <nav
        aria-label="Korisni linkovi"
        data-testid="manager-utility-nav"
        className="ml-auto hidden items-center gap-5 text-[13px] font-medium text-muted-foreground xl:flex"
      >
        {HEADER_UTILITY_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="no-underline hover:text-brand-600">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
        <Button size="sm" asChild className="hidden lg:inline-flex">
          <Link href={LISTING_NEW_PATH}>Objavi stvar</Link>
        </Button>

        <Link
          href={MANAGER_REQUESTS}
          aria-label={unread > 0 ? `Zahtevi, ${unread} nepročitanih` : 'Zahtevi'}
          data-testid="header-messages"
          className="relative hidden size-9 place-items-center rounded-full text-zinc-600 no-underline hover:bg-muted hover:text-foreground md:grid"
        >
          <MessageSquareIcon className="size-[18px]" strokeWidth={1.8} aria-hidden />
          {unread > 0 ? (
            <span
              data-testid="messages-unread-badge"
              className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </Link>

        {loading || !user ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Meni naloga"
                className="cursor-pointer rounded-full border-none bg-transparent p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Avatar className="size-9 after:border-transparent">
                  <AvatarFallback className="bg-brand-500 text-sm font-semibold text-white">
                    {getInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-[220px] p-2">
              <DropdownMenuItem asChild className="px-3 py-2.5 text-sm font-medium">
                <Link href={MANAGER_SETTINGS}>Podešavanja</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="px-3 py-2.5 text-sm font-medium">
                <Link href="/">Nazad na sajt</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem
                variant="destructive"
                disabled={signOut.isPending}
                onSelect={() => signOut.mutate()}
                className="px-3 py-2.5 text-sm font-medium"
              >
                Odjavi se
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
