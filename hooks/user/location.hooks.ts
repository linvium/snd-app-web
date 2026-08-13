'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationService, userQueryKeys } from '@/lib/user'
import type { AddLocationInput } from '@/types'

export function useLocations() {
  return useQuery({
    queryKey: userQueryKeys.locations(),
    queryFn: () => locationService.getLocations(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAddLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AddLocationInput) => locationService.addLocation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.locations() })
      queryClient.invalidateQueries({ queryKey: userQueryKeys.current() })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (locationId: string) => locationService.deleteLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.locations() })
    },
  })
}

export function useSetDefaultLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (locationId: string) => locationService.setDefaultLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.locations() })
      queryClient.invalidateQueries({ queryKey: userQueryKeys.current() })
    },
  })
}
