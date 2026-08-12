'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const MENU_ITEMS = [
  { name: 'Pregled profila', href: '/profile' },
  { name: 'Izmeni profil', href: '/profile/edit' },
  { name: 'Moje lokacije', href: '/profile/locations' },
  { name: 'Moji oglasi', href: '/profile/listings' },
  { name: 'Omiljeni', href: '/profile/favorites' },
  { name: 'Podešavanja', href: '/profile/settings' },
]

function BackHeader({ title }: { title: string }) {
  return (
    <header className="mb-2 -mx-4 flex items-center gap-2 border-b border-border bg-card px-4 py-3 lg:hidden">
      <Link
        href="/profile"
        aria-label="Nazad na profil"
        className="grid size-10 place-items-center rounded-md text-foreground"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <h1 className="m-0 text-[17px] font-normal text-foreground">{title}</h1>
    </header>
  )
}

function DesktopSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-[88px] hidden w-60 shrink-0 self-start rounded-xl border border-border bg-card py-2 lg:block">
      <nav aria-label="Profil meni">
        <ul className="m-0 list-none p-0">
          {MENU_ITEMS.map((item) => {
            const isActive =
              item.href === '/profile' ? pathname === '/profile' : pathname.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'block border-l-[3px] py-3 pr-4 pl-[13px] text-sm',
                    isActive
                      ? 'border-brand-500 bg-brand-50 font-semibold text-brand-500'
                      : 'border-transparent font-medium text-foreground'
                  )}
                >
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

function subpageTitle(pathname: string): string | null {
  if (pathname.startsWith('/profile/edit')) return 'Izmeni profil'
  if (pathname.startsWith('/profile/locations')) return 'Moje lokacije'
  if (pathname.startsWith('/profile/listings')) return 'Moji oglasi'
  if (pathname.startsWith('/profile/favorites')) return 'Omiljeni'
  if (pathname.startsWith('/profile/settings')) return 'Podešavanja'
  if (pathname.startsWith('/profile/verification')) return 'Verifikacija'
  return null
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const title = subpageTitle(pathname)

  return (
    <div className="mx-auto max-w-[960px] px-4 pt-4 pb-10">
      {title ? <BackHeader title={title} /> : null}

      <div className="flex items-start gap-6">
        <DesktopSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
