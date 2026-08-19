'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import { isListingPublishPath } from '@/lib/listings/listings.paths'
import { isLandingHomepage } from '@/lib/home/homepage-mode'
import { HEADER_HERO_OVERLAP_CLASS, headerOverlaysHero } from '@/lib/layout/header.helpers'
import { cn } from '@/lib/utils'

export default function MainFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLandingHome = isLandingHomepage() && pathname === '/'
  const isPublishFlow = isListingPublishPath(pathname)

  if (isLandingHome) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div
        className={cn(
          isPublishFlow ? 'pb-0' : 'pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0',
          headerOverlaysHero(pathname) && HEADER_HERO_OVERLAP_CLASS
        )}
      >
        {children}
      </div>
      {isPublishFlow ? null : <BottomNav />}
    </div>
  )
}
