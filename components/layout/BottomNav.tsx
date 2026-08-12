'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Početna',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: '/search',
    label: 'Pretraga',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: '/listings/new',
    label: 'Objavi',
    emphasized: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: '/messages',
    label: 'Poruke',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16v10H8l-4 4V6z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Donja navigacija"
      className="fixed right-0 bottom-0 left-0 z-40 grid h-[calc(56px+env(safe-area-inset-bottom))] grid-cols-5 items-center border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

        if (item.emphasized) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="-mt-[18px] flex flex-col items-center justify-center gap-0.5 no-underline"
            >
              <span className="grid size-11 place-items-center rounded-full bg-brand-500 text-white shadow-md">
                {item.icon}
              </span>
              <span
                className={cn(
                  'text-[11px] font-semibold',
                  isActive ? 'text-brand-600' : 'text-zinc-500'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[11px] no-underline',
              isActive ? 'font-semibold text-brand-600' : 'font-medium text-zinc-500'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
