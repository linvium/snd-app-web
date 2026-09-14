'use client'

import { useEffect, useState } from 'react'

import { SKELETON_DELAY_MS } from '@/lib/ui/pending.helpers'

/**
 * True only after `isPending` has lasted `delayMs`. Fast responses skip the
 * skeleton; slow ones get a placeholder that holds the layout.
 */
export function useDelayedPending(isPending: boolean, delayMs = SKELETON_DELAY_MS): boolean {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isPending) {
      setShow(false)
      return
    }

    const timer = window.setTimeout(() => setShow(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [isPending, delayMs])

  return show
}
