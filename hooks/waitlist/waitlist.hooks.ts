'use client'

import { useMutation } from '@tanstack/react-query'
import { waitlistService } from '@/lib/waitlist'

export function useJoinWaitlist() {
  return useMutation({
    mutationFn: (email: string) => waitlistService.join(email),
  })
}
