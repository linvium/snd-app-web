'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userQueryKeys, userService } from '@/lib/user'
import type { UpdateProfileInput } from '@/types'

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: userQueryKeys.current(),
    queryFn: () => userService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => userService.updateProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
    },
  })
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: userQueryKeys.public(userId),
    queryFn: () => userService.getPublicProfile(userId),
    staleTime: 10 * 60 * 1000,
    enabled: !!userId,
  })
}
