'use client'

import { Suspense, useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import HeaderSearch from '@/components/search/HeaderSearch'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MessageSquareIcon, UserIcon } from 'lucide-react'
import {
  HEADER_SEARCH_MAX_WIDTH_PX,
  HEADER_UTILITY_LINKS,
  headerIsFullWidth,
  headerOverlaysHero,
  headerShowsSearch,
} from '@/lib/layout/header.helpers'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/context/AuthContext'
import { useSignOut } from '@/hooks/auth'
import { useUnreadMessageCount } from '@/hooks/messages'

const ACCOUNT_MENU_ITEMS = [
  { href: '/profile', label: 'Moj profil' },
  { href: '/profile/listings', label: 'Moji oglasi' },
  { href: '/bookings', label: 'Moje rezervacije' },
  { href: '/profile/requests', label: 'Zahtevi' },
  { href: '/omiljeni', label: 'Omiljeni' },
] as const

function getInitials(email?: string | null) {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

export default function Header() {
  const { user, loading } = useAuthSession()
  const signOut = useSignOut()
  const pathname = usePathname()
  const [hasShadow, setHasShadow] = useState(false)
  const unread = useUnreadMessageCount(Boolean(user))

  const showsSearch = headerShowsSearch(pathname)
  const isFullWidth = headerIsFullWidth(pathname)
  const overlaysHero = headerOverlaysHero(pathname)
  const onHero = overlaysHero && !hasShadow

  useEffect(() => {
    const onScroll = () => setHasShadow(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = () => {
    signOut.mutate()
  }

  const innerClass = cn('mx-auto w-full px-4', isFullWidth ? 'md:px-6' : 'max-w-[1120px]')

  return (
    <>
      <div className="relative z-30">
        <div className={innerClass}>
          <nav
            aria-label="Korisni linkovi"
            data-testid="header-utility-nav"
            className={cn(
              'hidden h-8 items-center justify-end gap-4 text-[12px] font-medium lg:flex',
              overlaysHero ? 'text-white/80' : 'text-zinc-500'
            )}
          >
            {HEADER_UTILITY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={overlaysHero ? 'hover:text-white' : 'hover:text-foreground'}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <header
        className={cn(
          'sticky top-0 z-30 transition-[background-color,box-shadow,color,backdrop-filter] duration-200 ease-in-out',
          overlaysHero && !hasShadow ? 'bg-transparent' : 'bg-card/80 backdrop-blur-md',
          hasShadow && 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
        )}
      >
        <div className={innerClass}>
          <div
            data-testid="header-main"
            style={{ '--header-search-max': `${HEADER_SEARCH_MAX_WIDTH_PX}px` } as CSSProperties}
            className={cn(
              showsSearch
                ? 'grid min-h-14 grid-cols-[auto_1fr] items-center gap-x-3 lg:min-h-20 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,var(--header-search-max))_minmax(12rem,1fr)] lg:gap-x-5'
                : 'flex h-14 items-center justify-between gap-4 md:h-[72px]'
            )}
          >
            <Link href="/" aria-label="SND početna" className="shrink-0 justify-self-start">
              <Logo size="sm" variant={overlaysHero ? 'horizontal' : 'symbol'} />
            </Link>

            {showsSearch ? (
              <div
                data-testid="header-search"
                className="col-span-2 mx-auto w-full min-w-0 max-w-(--header-search-max) border-t border-border py-3 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:max-w-none lg:border-t-0 lg:py-2"
              >
                {/* useSearchParams needs a boundary; the bar is not worth blocking on. */}
                <Suspense fallback={<div className="h-12 md:h-16" />}>
                  <HeaderSearch />
                </Suspense>
              </div>
            ) : null}

            <div
              className={cn(
                'flex items-center gap-2.5',
                showsSearch && 'col-start-2 row-start-1 justify-self-end lg:col-start-3'
              )}
            >
              {user ? (
                <Link href="/profile/listings/new" className="hidden lg:inline-flex">
                  <Button size="sm">Objavi stvar</Button>
                </Link>
              ) : null}

              {user ? (
                <Link
                  href="/profile/requests"
                  aria-label={unread > 0 ? `Zahtevi, ${unread} nepročitanih` : 'Zahtevi'}
                  data-testid="header-messages"
                  className={cn(
                    'relative hidden size-9 place-items-center rounded-full no-underline md:grid',
                    onHero
                      ? 'text-white/80 hover:bg-white/10 hover:text-white'
                      : 'text-zinc-600 hover:bg-muted hover:text-foreground'
                  )}
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
              ) : null}

              {loading ? null : user ? (
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
                    {ACCOUNT_MENU_ITEMS.map((item) => (
                      <DropdownMenuItem key={item.href} asChild className="px-3 py-2.5 text-sm font-medium">
                        <Link href={item.href}>{item.label}</Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="my-1.5" />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={signOut.isPending}
                      onSelect={handleSignOut}
                      className="px-3 py-2.5 text-sm font-medium"
                    >
                      Odjavi se
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href="/auth/login" className="hidden md:inline-flex">
                    <Button variant="secondary" size="sm">
                      Prijavi se
                    </Button>
                  </Link>
                  <Link href="/auth/register" className="hidden md:inline-flex">
                    <Button size="sm">Registruj se</Button>
                  </Link>
                  <Link
                    href="/auth/login"
                    aria-label="Prijavi se"
                    className={cn(
                      'grid size-9 place-items-center rounded-full border md:hidden',
                      onHero ? 'border-white/40 text-white' : 'border-zinc-300 text-zinc-500'
                    )}
                  >
                    <UserIcon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
