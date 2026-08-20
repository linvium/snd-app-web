'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HeartIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  PackageIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react'

import { MANAGER_NAV, managerNavItemIsActive, type ManagerNavKey } from '@/lib/profiles'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/context/AuthContext'
import { useUnreadMessageCount } from '@/hooks/messages'

const RAIL_ICONS: Record<ManagerNavKey, LucideIcon> = {
  overview: LayoutGridIcon,
  listings: PackageIcon,
  requests: MessageSquareIcon,
  favorites: HeartIcon,
  settings: SettingsIcon,
}

/**
 * The manager's own navigation: a narrow icon rail on desktop, which keeps the
 * five sections one click apart without eating the width the content needs.
 *
 * Phones use the app's bottom nav instead, so the rail is desktop-only.
 */
export default function ManagerRail() {
  const pathname = usePathname()
  const { user } = useAuthSession()
  const unread = useUnreadMessageCount(Boolean(user))

  return (
    <nav
      aria-label="Profil meni"
      data-testid="manager-rail"
      className="sticky top-16 hidden h-[calc(100svh-4rem)] w-[76px] shrink-0 flex-col items-center gap-1 self-start border-r border-border bg-card py-3.5 lg:flex"
    >
      {MANAGER_NAV.map((item) => {
        const Icon = RAIL_ICONS[item.key]
        const isActive = managerNavItemIsActive(pathname, item.href)
        const count = item.counter === 'unread' ? unread : 0

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative grid w-14 justify-items-center gap-1.5 rounded-xl px-1 pt-2.5 pb-2 text-center text-[10.5px] leading-tight no-underline transition-colors',
              item.footer && 'mt-auto',
              isActive
                ? 'bg-brand-50 font-semibold text-brand-600'
                : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-[19px]" strokeWidth={1.8} aria-hidden />
            <span>{item.label}</span>
            {count > 0 ? (
              <span
                data-testid="messages-unread-badge"
                className="absolute top-1 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white"
              >
                {count > 9 ? '9+' : count}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
