'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

import SupportSheet from '@/components/pages/SupportSheet'
import { pagePath, parsePagePath } from '@/lib/pages/pages.paths'

interface SupportSheetValue {
  /** The page being read, or null when the sheet is closed. */
  slug: string | null
  minimised: boolean
  canGoBack: boolean
  open: (slug: string) => void
  close: () => void
  back: () => void
  minimise: () => void
  restore: () => void
}

const SupportSheetContext = createContext<SupportSheetValue | null>(null)

export function useSupportSheet(): SupportSheetValue {
  const value = useContext(SupportSheetContext)
  if (!value) throw new Error('useSupportSheet must be used inside SupportSheetProvider')
  return value
}

/**
 * Help without leaving the page.
 *
 * Every help and legal page is a real route — that is what Google indexes and
 * what a shared link opens. But someone reading cancellation terms halfway
 * through a booking should not have their form thrown away to find out what
 * "strogo" means, so a plain left click on any `/support/...` or `/legal/...`
 * link opens the same content in a sheet over the current page instead.
 *
 * The interception is one delegated listener rather than a `<SupportLink>`
 * component on purpose: links to these pages also come out of `pages.content`
 * as raw HTML, and a component cannot reach those. Anything that means "leave
 * this page" — middle click, cmd-click, target=_blank — is left alone, and a
 * subtree can opt out entirely with `data-page-sheet="off"`.
 */
export function SupportSheetProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [stack, setStack] = useState<string[]>([])
  const [minimised, setMinimised] = useState(false)

  const open = useCallback((slug: string) => {
    setMinimised(false)
    setStack((current) => (current[current.length - 1] === slug ? current : [...current, slug]))
  }, [])

  const close = useCallback(() => {
    setStack([])
    setMinimised(false)
  }, [])

  const back = useCallback(() => {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current))
  }, [])

  const minimise = useCallback(() => setMinimised(true), [])
  const restore = useCallback(() => setMinimised(false), [])

  // A route change is a new context; a sheet left hanging over it would be a
  // leftover from a screen the reader has already moved on from.
  useEffect(() => {
    setStack([])
    setMinimised(false)
  }, [pathname])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a')
      if (!anchor) return

      const anchorTarget = anchor.getAttribute('target')
      if (anchorTarget && anchorTarget !== '_self') return
      if (anchor.hasAttribute('download')) return
      if (anchor.closest('[data-page-sheet="off"]')) return

      const href = anchor.getAttribute('href')
      if (!href) return

      const parsed = parsePagePath(href)
      if (!parsed) return

      // Already reading this page as a document: the link is a plain anchor to
      // where the reader stands, and a sheet on top of it would be a copy of
      // the page over itself.
      if (pagePath(parsed.category, parsed.slug) === window.location.pathname) return

      // Both, and in the capture phase: `next/link` navigates from its own
      // handler on the anchor, so by the time a bubbling listener sees the
      // click the router has already moved. Stopping it here is what keeps the
      // page underneath alive.
      event.preventDefault()
      event.stopPropagation()
      open(parsed.slug)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [open])

  const value = useMemo<SupportSheetValue>(
    () => ({
      slug: stack[stack.length - 1] ?? null,
      minimised,
      canGoBack: stack.length > 1,
      open,
      close,
      back,
      minimise,
      restore,
    }),
    [stack, minimised, open, close, back, minimise, restore]
  )

  return (
    <SupportSheetContext.Provider value={value}>
      {children}
      <SupportSheet />
    </SupportSheetContext.Provider>
  )
}
