'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { ChevronLeftIcon } from 'lucide-react'
import ManagerRail from '@/components/profile/ManagerRail'
import { isListingPublishPath } from '@/lib/listings/listings.paths'
import { MANAGER_REQUESTS, managerBackHref, managerSubpageTitle } from '@/lib/profiles'
import { cn } from '@/lib/utils'

function BackHeader({ title, href }: { title: string; href: string }) {
  return (
    <header className="-mx-4 mb-3 flex items-center gap-2 border-b border-border bg-card px-4 py-3 lg:hidden">
      <Link
        href={href}
        aria-label="Nazad"
        className="grid size-10 place-items-center rounded-md text-foreground"
      >
        <ChevronLeftIcon className="size-[22px]" strokeWidth={2} aria-hidden />
      </Link>
      <h1 className="m-0 text-[17px] font-normal text-foreground">{title}</h1>
    </header>
  )
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (isListingPublishPath(pathname)) {
    return <>{children}</>
  }

  // The requests workspace is a two-pane app that owns its own scrolling; the
  // page padding and reading width would only get in its way.
  const isWorkspace = pathname === MANAGER_REQUESTS || pathname.startsWith(`${MANAGER_REQUESTS}/`)
  const title = isWorkspace ? null : managerSubpageTitle(pathname)

  return (
    // Full bleed: the rail sits against the left edge of the screen, and only
    // the content inside it gets a reading width.
    <div className="flex w-full items-start">
      <ManagerRail />
      <main
        className={cn(
          'min-w-0 flex-1',
          isWorkspace && 'lg:h-[calc(100svh-4rem)] lg:overflow-hidden'
        )}
      >
        {isWorkspace ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-[1180px] px-4 pt-4 pb-10 lg:px-8 lg:pt-7">
            {title ? <BackHeader title={title} href={managerBackHref(pathname)} /> : null}
            {children}
          </div>
        )}
      </main>
    </div>
  )
}
