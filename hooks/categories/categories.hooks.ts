'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { buildCategoryTree, categoriesService, categoryKeys } from '@/lib/categories'

export function useCategoryTree(
  options: { lat?: number | null; lng?: number | null; radiusKm?: number | null } = {}
) {
  const { lat = null, lng = null, radiusKm = null } = options

  const query = useQuery({
    queryKey: categoryKeys.tree(lat, lng, radiusKm),
    queryFn: ({ signal }) => categoriesService.getTree({ lat, lng, radiusKm }, signal),
    // The tree changes when listings are published, not between clicks.
    staleTime: 5 * 60 * 1000,
  })

  const tree = useMemo(() => buildCategoryTree(query.data ?? []), [query.data])

  return { ...query, flat: query.data ?? [], tree }
}
