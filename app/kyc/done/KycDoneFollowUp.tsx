'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function KycDoneFollowUp({
  mode,
  delayMs = 2500,
}: {
  mode: 'redirect' | 'reload'
  delayMs?: number
}) {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (mode === 'redirect') {
        router.push('/profile')
        return
      }
      window.location.reload()
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [delayMs, mode, router])

  return null
}
