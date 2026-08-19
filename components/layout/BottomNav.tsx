'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HouseIcon, MessageSquareIcon, PlusIcon, SearchIcon, UserIcon, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAuthSession } from '@/context/AuthContext'
import { useUnreadMessageCount } from '@/hooks/messages'

const NAV_ITEMS: {
  href: string
  label: string
  icon: LucideIcon
  emphasized?: boolean
}[] = [
  { href: '/', label: 'Početna', icon: HouseIcon },
  { href: '/search', label: 'Pretraga', icon: SearchIcon },
  { href: '/profile/listings/new', label: 'Objavi', icon: PlusIcon, emphasized: true },
  { href: '/profile/requests', label: 'Zahtevi', icon: MessageSquareIcon },
  { href: '/profile', label: 'Profil', icon: UserIcon },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuthSession()
  const unread = useUnreadMessageCount(Boolean(user))

  return (
    <nav
      aria-label="Donja navigacija"
      className="fixed right-0 bottom-0 left-0 z-40 grid h-[calc(56px+env(safe-area-inset-bottom))] grid-cols-5 items-center border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : item.href === '/profile'
              ? pathname === '/profile' ||
                (pathname.startsWith('/profile') && !pathname.startsWith('/profile/requests'))
              : pathname.startsWith(item.href)
        const Icon = item.icon

        if (item.emphasized) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="-mt-[18px] flex flex-col items-center justify-center gap-0.5 no-underline"
            >
              <span className="grid size-11 place-items-center rounded-full bg-brand-500 text-white shadow-md">
                <Icon className="size-[22px]" strokeWidth={2.2} aria-hidden />
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
              'relative flex flex-col items-center justify-center gap-0.5 text-[11px] no-underline',
              isActive ? 'font-semibold text-brand-600' : 'font-medium text-zinc-500'
            )}
          >
            <Icon className="size-[22px]" strokeWidth={1.8} aria-hidden />
            {item.href === '/profile/requests' && unread > 0 ? (
              <span
                data-testid="messages-unread-badge"
                className="absolute top-0 right-[18%] grid min-w-4 translate-x-1/2 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold leading-4 text-white"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
