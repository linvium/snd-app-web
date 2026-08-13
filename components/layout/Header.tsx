'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [hasShadow, setHasShadow] = useState(false)

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
        'sticky top-0 z-30 h-14 bg-card transition-shadow duration-200 ease-in-out md:h-[72px]',
        hasShadow && 'shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
      )}
    >
      <div className="mx-auto flex h-full max-w-[1120px] items-center justify-between gap-4 px-4">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
