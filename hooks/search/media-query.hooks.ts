'use client'

import { useEffect, useState } from 'react'

/**
 * The search page shows the map in one of three slots depending on width, and
 * it must be exactly one: Leaflet claims a real DOM node, so a copy parked in a
 * `hidden` container is a second live map fetching its own tiles at zero size.
 * CSS alone cannot express that, hence a real media query.
 */
export function useMediaQuery(query: string): boolean {
  // Starts false so the server render and first client render agree; the
  // effect corrects it before paint.
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const list = window.matchMedia(query)
    setMatches(list.matches)

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Breakpoints from doc 10 §6. */
export const MEDIA_DESKTOP_WIDE = '(min-width: 1280px)'
export const MEDIA_TABLET = '(min-width: 768px) and (max-width: 1279px)'
export const MEDIA_MOBILE = '(max-width: 767px)'
