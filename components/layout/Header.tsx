'use client'

import { Suspense, useEffect, useState } from 'react'
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
import { UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/context/AuthContext'
import { useSignOut } from '@/hooks/auth'

const ACCOUNT_MENU_ITEMS = [
  { href: '/profile', label: 'Moj profil' },
  { href: '/moji-oglasi', label: 'Moji oglasi' },
  { href: '/bookings', label: 'Moje rezervacije' },
  { href: '/messages', label: 'Poruke' },
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

  // Every page but the home page carries the search bar, so a new search can
  // be started from wherever the user happens to be (doc 03 §4).
  const showsSearch = pathname !== '/'

  useEffect(() => {
    const onScroll = () => setHasShadow(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = () => {
    signOut.mutate()
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-card transition-shadow duration-200 ease-in-out',
        hasShadow && 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-4 px-4 md:h-[72px]">
        <Link href="/" aria-label="SND početna">
          <Logo size="sm" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 text-[15px] font-medium text-zinc-700 lg:flex">
          <Link href="/kako-funkcionise" className="hover:text-foreground">
            Kako funkcioniše
          </Link>
          <Link href="/garancija" className="hover:text-foreground">
            Garancija
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <Link href="/listings/new" className="hidden lg:inline-flex">
              <Button size="sm">Objavi predmet</Button>
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
                className="grid size-9 place-items-center rounded-full border border-zinc-300 text-zinc-500 md:hidden"
              >
                <UserIcon className="size-[18px]" strokeWidth={1.8} aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>

      {showsSearch ? (
        <div className="border-t border-border px-4 py-2.5 md:border-none md:pt-0 md:pb-3">
          <div className="mx-auto max-w-[1120px]">
            {/* useSearchParams needs a boundary; the bar is not worth blocking on. */}
            <Suspense fallback={<div className="h-11" />}>
              <HeaderSearch />
            </Suspense>
          </div>
        </div>
      ) : null}
    </header>
  )
}
