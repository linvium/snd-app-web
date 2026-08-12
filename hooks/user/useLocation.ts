'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationService } from '@/services/user/locationService'
import { queryKeys } from '@/lib/queryKeys'
import type { AddLocationInput } from '@/types'

export function useLocations() {
  return useQuery({
    queryKey: queryKeys.user.locations(),
    queryFn: () => locationService.getLocations(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAddLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AddLocationInput) => locationService.addLocation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.locations() })
      queryClient.invalidateQueries({ queryKey: queryKeys.user.current() })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (locationId: string) => locationService.deleteLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.locations() })
    },
  })
}

export function useSetDefaultLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (locationId: string) => locationService.setDefaultLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.locations() })
      queryClient.invalidateQueries({ queryKey: queryKeys.user.current() })
    },
  })
}
