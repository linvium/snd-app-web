'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import HeaderSearchBar from '@/components/search/HeaderSearchBar'
import MobileSearchModal from '@/components/search/MobileSearchModal'
import { useLocations } from '@/hooks/user'
import { parseSearchParams, searchUrl, withFilters, type Coordinates } from '@/lib/search'
import type { SearchParams } from '@/types/search'

/**
 * Connects the header's search bar to the URL.
 *
 * On `/search` this edits the search in place; anywhere else it starts a new
 * one, which is the point of keeping the bar visible everywhere (doc 03 §4).
 */
export default function HeaderSearch({ compact = false }: { compact?: boolean } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)

  const isSearchPage = pathname === '/search'
  const params = useMemo(
    () => (isSearchPage ? parseSearchParams(searchParams) : parseSearchParams(new URLSearchParams())),
    [isSearchPage, searchParams]
  )

  const { data: locations } = useLocations()
  const profileCoords = useMemo<Coordinates | null>(() => {
    const preferred = locations?.find((location) => location.is_default) ?? locations?.[0]
    return preferred
      ? { lat: Number(preferred.approx_latitude), lng: Number(preferred.approx_longitude) }
      : null
  }, [locations])

  const go = (next: SearchParams) => {
    router.push(searchUrl(next))
  }

  return (
    <>
      <HeaderSearchBar
        compact={compact}
        params={params}
        onSubmit={(changes) => go(withFilters(params, changes))}
        onOpenMobileModal={() => setModalOpen(true)}
      />

      <MobileSearchModal
        open={modalOpen}
        params={params}
        profileCoords={profileCoords}
        onClose={() => setModalOpen(false)}
        onSubmit={(next) => {
          setModalOpen(false)
          go(next)
        }}
      />
    </>
  )
}
