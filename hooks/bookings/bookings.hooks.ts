'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { bookingsService } from '@/lib/bookings'
import { conversationKeys } from '@/lib/messages'
import type {
  CreateBookingRequestInput,
  RespondToBookingInput,
  SubmitBookingReviewInput,
} from '@/types/booking'

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

export function useSubmitBookingReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitBookingReviewInput) => bookingsService.review(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all })
      if (result.conversationId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.thread(result.conversationId) })
      }
    },
  })
}

export const paymentLinkKeys = {
  all: ['payment-link'] as const,
  byToken: (token: string) => ['payment-link', token] as const,
}

/**
 * The link's state.
 *
 * Normally static - it changes when money moves, not on a timer. The exception
 * is the moment the renter returns from the provider: the webhook that settles
 * the booking races the redirect, so `awaitingConfirmation` polls until the
 * link flips rather than showing a paid customer an unpaid page.
 */
export function usePaymentLink(token: string, options?: { awaitingConfirmation?: boolean }) {
  return useQuery({
    queryKey: paymentLinkKeys.byToken(token),
    queryFn: () => bookingsService.paymentLink(token),
    enabled: Boolean(token),
    staleTime: options?.awaitingConfirmation ? 0 : 30_000,
    retry: false,
    refetchInterval: (query) => {
      if (!options?.awaitingConfirmation) return false
      return query.state.data?.status === 'pending' ? 2_000 : false
    },
  })
}

export function useStartCheckout(token: string) {
  return useMutation({
    mutationFn: () => bookingsService.startCheckout(token),
    // The provider's page is the next step, so nothing renders after this.
    onSuccess: (result) => {
      window.location.href = result.url
    },
  })
}

export function useConfirmPayment(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => bookingsService.confirmPayment(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentLinkKeys.byToken(token) })
      queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    },
  })
}
