'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { buildSearchQuery, parseSearchParams, withFilters } from '@/lib/search'
import type { SearchParams } from '@/types/search'

/**
 * The URL is the state (doc 03 §2). This hook is the only place that writes to
 * it, so the history rule lives in exactly one function:
 *
 *   filters → replaceState, paging → pushState
 *
 * Otherwise "back" would step through every position a price slider passed
 * through on its way to a value.
 */
export function useSearchUrlState() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Reading straight from useSearchParams would miss our own replaceState
  // writes, since Next does not re-render for them. Local state is the source
  // of truth between navigations; the effect below re-syncs on real ones.
  const fromUrl = useMemo(() => parseSearchParams(searchParams), [searchParams])
  const [params, setParams] = useState<SearchParams>(fromUrl)

  useEffect(() => {
    setParams(fromUrl)
  }, [fromUrl])

  const write = useCallback(
    (next: SearchParams, mode: 'replace' | 'push') => {
      setParams(next)

      const query = buildSearchQuery(next).toString()
      const url = query ? `${pathname}?${query}` : pathname

      if (mode === 'push') {
        window.history.pushState(null, '', url)
      } else {
        window.history.replaceState(null, '', url)
      }
    },
    [pathname]
  )

  /** Any filter change: rewrites the current history entry. */
  const updateFilters = useCallback(
    (changes: Partial<SearchParams>) => {
      write(withFilters(params, changes), 'replace')
    },
    [params, write]
  )

  /** Page changes: a real navigation the user expects "back" to undo. */
  const goToPage = useCallback(
    (page: number) => {
      write({ ...params, page }, 'push')
    },
    [params, write]
  )

  /** Replaces the whole search — what the mobile modal commits on "Pretraži". */
  const replaceAll = useCallback(
    (next: SearchParams) => {
      write({ ...next, page: 1 }, 'push')
    },
    [write]
  )

  // The browser's own back/forward must still be heard, since our
  // replaceState writes bypass Next's router.
  useEffect(() => {
    const onPopState = () => {
      setParams(parseSearchParams(new URLSearchParams(window.location.search)))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return { params, updateFilters, goToPage, replaceAll }
}

/** Debounce for the price fields — 400 ms for typing, 0 for buttons (§12). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value)
      return
    }
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
