'use client'

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { billingKeys, billingService } from '@/lib/billing'
import type { BillingCatalog, CreateBillingOrderInput } from '@/types/billing'

export function useBillingCatalog(initialData?: BillingCatalog) {
  return useQuery({
    queryKey: billingKeys.catalog(),
    queryFn: ({ signal }) => billingService.catalog(signal),
    initialData,
    // Prices change by a database edit, not while someone is reading them.
    staleTime: 5 * 60 * 1000,
  })
}

/** The owner's plan, slot usage, credits and credit history. */
export function useBillingSummary(enabled = true) {
  return useQuery({
    queryKey: billingKeys.summary(),
    queryFn: ({ signal }) => billingService.summary(signal),
    enabled,
  })
}

export function useStartBillingCheckout() {
  return useMutation({
    mutationFn: (input: CreateBillingOrderInput) => billingService.startCheckout(input),
    // The provider's page (or, in sandbox, the billing page) is the next step.
    onSuccess: (result) => {
      window.location.href = result.url
    },
  })
}

/**
 * An order's state after the owner comes back from checkout.
 *
 * The webhook that settles the order races the redirect, so
 * `awaitingConfirmation` polls until the order flips rather than showing a
 * paying owner an unpaid order. Once it is paid, the summary is refetched so
 * the new plan or credits appear without a reload.
 */
export function useBillingOrder(token: string | null, options?: { awaitingConfirmation?: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: billingKeys.order(token ?? ''),
    queryFn: () => billingService.order(token as string),
    enabled: Boolean(token),
    staleTime: options?.awaitingConfirmation ? 0 : 30_000,
    retry: false,
    refetchInterval: (current) => {
      if (!options?.awaitingConfirmation) return false
      return current.state.data?.status === 'pending' ? 2_000 : false
    },
  })

  const paid = query.data?.status === 'paid'
  useEffect(() => {
    if (paid) queryClient.invalidateQueries({ queryKey: billingKeys.summary() })
  }, [paid, queryClient])

  return query
}

export function useConfirmBillingOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => billingService.confirmOrder(token),
    onSuccess: (_result, token) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.order(token) })
      queryClient.invalidateQueries({ queryKey: billingKeys.summary() })
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => billingService.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.summary() })
    },
  })
}
