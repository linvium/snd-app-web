'use client'

import { useEffect, useMemo, useState } from 'react'
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

export function useCategoryCatalog() {
  const query = useQuery({
    queryKey: categoryKeys.catalog(),
    queryFn: ({ signal }) => categoriesService.getCatalog(signal),
    staleTime: 10 * 60 * 1000,
  })

  const tree = useMemo(() => buildCategoryTree(query.data ?? []), [query.data])

  return { ...query, flat: query.data ?? [], tree }
}

export function useCategorySuggest(title: string) {
  const [debounced, setDebounced] = useState(title.trim())

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(title.trim()), 600)
    return () => window.clearTimeout(timer)
  }, [title])

  return useQuery({
    queryKey: categoryKeys.suggest(debounced),
    queryFn: ({ signal }) => categoriesService.suggest(debounced, signal),
    enabled: debounced.length >= 3,
    staleTime: 60 * 1000,
  })
}
