'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Shown on mobile when the page has no other way back (no bottom nav, or a
 * nested flow like publish / item detail).
 */
export function MobileBackLink({
  href,
  label = 'Nazad',
  className,
}: {
  href?: string
  label?: string
  className?: string
}) {
  const router = useRouter()

  const classes = cn(
    'grid size-10 shrink-0 place-items-center rounded-md text-foreground no-underline hover:bg-muted lg:hidden',
    className
  )

  if (href) {
    return (
      <Link href={href} aria-label={label} data-testid="mobile-back" className={classes}>
        <ChevronLeftIcon className="size-[22px]" strokeWidth={2} aria-hidden />
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-label={label}
      data-testid="mobile-back"
      className={classes}
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
          return
        }
        router.push('/')
      }}
    >
      <ChevronLeftIcon className="size-[22px]" strokeWidth={2} aria-hidden />
    </button>
  )
}
