'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { kycQueryKeys } from '@/lib/kyc/kyc.query'
import { kycService } from '@/lib/kyc/kyc.service'

export function useKycVerification(enabled = true) {
  return useQuery({
    queryKey: kycQueryKeys.current(),
    queryFn: () => kycService.getCurrent(),
    staleTime: 30 * 1000,
    enabled,
  })
}

export function useStartKyc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => kycService.start(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kycQueryKeys.all })
    },
  })
}
