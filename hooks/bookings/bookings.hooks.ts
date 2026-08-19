'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { bookingsService } from '@/lib/bookings'
import { conversationKeys } from '@/lib/messages'
import type { CreateBookingRequestInput } from '@/types/booking'

export function useCreateBookingRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBookingRequestInput) => bookingsService.createRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    },
  })
}
