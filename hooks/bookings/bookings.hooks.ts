'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { bookingsService } from '@/lib/bookings'
import { conversationKeys } from '@/lib/messages'
import type { CreateBookingRequestInput, RespondToBookingInput } from '@/types/booking'

export function useCreateBookingRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBookingRequestInput) => bookingsService.createRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    },
  })
}

export function useRespondToBookingRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RespondToBookingInput) => bookingsService.respond(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all })
      queryClient.invalidateQueries({ queryKey: conversationKeys.thread(result.conversationId) })
    },
  })
}
