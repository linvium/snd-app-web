'use client'

import { useEffect, useState } from 'react'

import { formatLongDate, greetingForHour, pendingActionsLabel } from '@/lib/dashboard'

/**
 * Greeting and date come from the reader's clock, not the server's, so they are
 * filled in after mount — rendering them on the server would hydrate wrong for
 * anyone in another timezone.
 */
export function DashboardGreeting({
  name,
  pendingCount,
}: {
  name: string
  pendingCount: number
}) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
  }, [])

  return (
    <div className="min-w-0">
      <h1 className="m-0 truncate text-[22px] font-normal tracking-[-0.02em] text-foreground lg:text-[25px]">
        {now ? `${greetingForHour(now.getHours())}, ${name}` : name}
      </h1>
      <p className="mt-1 mb-0 text-[13.5px] text-muted-foreground">
        {now ? `${formatLongDate(now)} · ` : ''}
        {pendingActionsLabel(pendingCount)}
      </p>
    </div>
  )
}
