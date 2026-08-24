'use client'

import { usePathname } from 'next/navigation'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import ManagerHeader from '@/components/layout/ManagerHeader'
import BottomNav from '@/components/layout/BottomNav'
import { isListingPublishPath } from '@/lib/listings/listings.paths'
import { isLandingHomepage } from '@/lib/home/homepage-mode'
import { footerIsVisible } from '@/lib/layout/footer.helpers'
import { HEADER_HERO_OVERLAP_CLASS, headerOverlaysHero } from '@/lib/layout/header.helpers'
import { isManagerPath, isRequestThreadPath } from '@/lib/profiles'
import { cn } from '@/lib/utils'

export default function MainFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLandingHome = isLandingHomepage() && pathname === '/'
  const isPublishFlow = isListingPublishPath(pathname)

  // The manager runs on its own chrome: one full-bleed 64px row instead of the
  // public header's three stacked rows, so the rail below can sit flush against
  // the left edge of the screen.
  const isManager = isManagerPath(pathname)

  // A conversation on a phone is a screen of its own: the top bar and the
  // bottom nav step aside so the composer can own the bottom edge instead of
  // stacking on top of a nav bar. Both come back at lg, where the thread is
  // one pane of the workspace rather than the whole viewport.
  const isMobileThread = isRequestThreadPath(pathname)

  if (isLandingHome) {
    return <>{children}</>
  }

  if (isManager) {
    return (
      <div className="min-h-screen bg-background">
        <ManagerHeader hiddenOnMobile={isMobileThread} />
        <div
          className={cn(
            isMobileThread ? 'pb-0' : 'pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0'
          )}
        >
          {children}
        </div>
        <BottomNav hidden={isMobileThread} />
      </div>
    )
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
        {/* Inside the padded wrapper: on a phone the bottom nav is fixed over
            the page, and a footer outside it would end underneath the bar. */}
        {footerIsVisible(pathname) ? <Footer /> : null}
      </div>
      {isPublishFlow ? null : <BottomNav />}
    </div>
  )
}
