'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ListIcon, MapIcon } from 'lucide-react'

import FilterBar from '@/components/search/FilterBar'
import SearchEmptyState from '@/components/search/SearchEmptyState'
import SearchMapPanel from '@/components/search/SearchMapPanel'
import ListingCard, { ListingCardSkeleton } from '@/components/listings/ListingCard'
import { Button } from '@/components/ui/button'
import { useCategoryTree } from '@/hooks/categories'
import {
  MEDIA_DESKTOP_WIDE,
  MEDIA_TABLET,
  useMediaQuery,
  useSearchPins,
  useSearchResults,
  useSearchUrlState,
} from '@/hooks/search'
import { useLocations } from '@/hooks/user'
import { findCategory } from '@/lib/categories'
import { clearFilters, pluralizeItems, resultsHeading, type Coordinates } from '@/lib/search'
import { cn } from '@/lib/utils'
import { SEARCH_PAGE_SIZE, type SearchCenterSource, type SearchResultListing } from '@/types/search'

/**
 * The search page (doc 03 §3).
 *
 * Layout follows the breakpoints exactly: a sticky map beside the list on wide
 * screens, a list/map toggle on tablets, and a floating button opening a
 * full-screen map on phones. The map is never required — everything it shows is
 * also in the list (§13).
 */
export default function SearchResults() {
  const { params, updateFilters, goToPage } = useSearchUrlState()
  const [tabletView, setTabletView] = useState<'list' | 'map'>('list')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const isDesktopWide = useMediaQuery(MEDIA_DESKTOP_WIDE)
  const isTablet = useMediaQuery(MEDIA_TABLET)

  const { data: locations } = useLocations()
  const profileCoords = useMemo<Coordinates | null>(() => {
    const preferred = locations?.find((location) => location.is_default) ?? locations?.[0]
    return preferred
      ? { lat: Number(preferred.approx_latitude), lng: Number(preferred.approx_longitude) }
      : null
  }, [locations])

  // Whatever put the coordinates in the URL decides the heading (§7.4). A
  // shared link carries no such history, so it reads as a city search.
  const centerSourceRef = useRef<SearchCenterSource>('city_center')
  const hasCenter = params.lat !== null && params.lng !== null
  const centerSource: SearchCenterSource = hasCenter ? centerSourceRef.current : 'none'

  const results = useSearchResults(params, centerSource)
  const pinsQuery = useSearchPins(params, centerSource)
  const { tree, flat } = useCategoryTree({
    lat: params.lat,
    lng: params.lng,
    radiusKm: hasCenter ? params.radiusKm : null,
  })

  // "Prikaži još" appends rather than replaces, so earlier pages stay on
  // screen (doc 03 §12).
  const [accumulated, setAccumulated] = useState<SearchResultListing[]>([])
  const pageSignature = useMemo(
    () => JSON.stringify({ ...params, page: undefined }),
    [params]
  )
  const lastSignature = useRef(pageSignature)

  useEffect(() => {
    if (!results.data) return

    if (lastSignature.current !== pageSignature) {
      lastSignature.current = pageSignature
      setAccumulated(results.data.data)
      return
    }

    setAccumulated((previous) => {
      if (params.page === 1) return results.data!.data
      const seen = new Set(previous.map((listing) => listing.id))
      return [...previous, ...results.data!.data.filter((listing) => !seen.has(listing.id))]
    })
  }, [results.data, pageSignature, params.page])

  const meta = results.data?.meta
  const total = meta?.total ?? 0
  const listings = accumulated
  const hasMore = meta ? params.page < meta.total_pages : false

  const selectedCategory = findCategory(flat, params.category)

  const handleSearchThisArea = useCallback(
    (center: Coordinates, radiusKm: number) => {
      // The map's own centre replaces the city's, and it is not the user's GPS.
      centerSourceRef.current = 'city_center'
      updateFilters({ lat: center.lat, lng: center.lng, radiusKm, city: null })
    },
    [updateFilters]
  )

  const heading = resultsHeading(total, centerSource, params.city)

  const isInitialLoad = results.isLoading && listings.length === 0
  const isEmpty = !results.isLoading && !results.isError && total === 0

  const mapPanel = (
    <SearchMapPanel
      pins={pinsQuery.data?.data ?? []}
      truncated={pinsQuery.data?.meta.truncated ?? false}
      listings={listings}
      center={hasCenter ? { lat: params.lat!, lng: params.lng! } : null}
      userCoords={centerSource === 'user_gps' && hasCenter ? { lat: params.lat!, lng: params.lng! } : profileCoords}
      highlightedId={highlightedId}
      onHoverChange={setHighlightedId}
      onSearchThisArea={handleSearchThisArea}
    />
  )

  return (
    <div className="min-h-screen">
      <FilterBar
        params={params}
        categories={tree}
        hasLocation={hasCenter}
        onChange={updateFilters}
        onClearAll={() => updateFilters(clearFilters(params))}
      />

      {/* Screen readers get the count as soon as it settles (doc 03 §13). */}
      <p aria-live="polite" className="sr-only">
        {results.isLoading ? 'Učitavam rezultate…' : `Pronađeno ${pluralizeItems(total)}`}
      </p>

      {/* Tablet switch. It sits outside both columns so that choosing the map
          does not also hide the control that gets you back (doc 03 §3.2). */}
      <div className="hidden items-center justify-between gap-3 px-6 pt-5 md:flex xl:hidden">
        <h1 className="text-lg font-semibold text-card-foreground">
          {results.isLoading && listings.length === 0 ? 'Tražim…' : heading}
        </h1>
        <div className="flex shrink-0 rounded-full border border-border bg-card p-0.5">
          <ViewToggle
            active={tabletView === 'list'}
            onClick={() => setTabletView('list')}
            icon={<ListIcon className="size-4" aria-hidden />}
            label="Lista"
          />
          <ViewToggle
            active={tabletView === 'map'}
            onClick={() => setTabletView('map')}
            icon={<MapIcon className="size-4" aria-hidden />}
            label="Mapa"
          />
        </div>
      </div>

      <div className="flex">
        <div
          className={cn(
            'w-full xl:w-[68%]',
            // On tablet the map replaces the list rather than sitting beside it.
            isTablet && tabletView === 'map' && 'hidden'
          )}
        >
          <div className="px-4 py-5 md:px-6">
            {/* On tablet the heading lives in the toggle row above instead. */}
            <h1 className="mb-4 text-lg font-semibold text-card-foreground md:hidden xl:block">
              {results.isLoading && listings.length === 0 ? 'Tražim…' : heading}
            </h1>

            {meta?.did_you_mean ? (
              <p className="mb-4 text-sm text-zinc-600">
                Da li si mislio{' '}
                <button
                  type="button"
                  onClick={() => updateFilters({ q: meta.did_you_mean! })}
                  className="cursor-pointer border-none bg-transparent p-0 font-semibold text-brand-600 underline"
                >
                  „{meta.did_you_mean}”
                </button>
                ?
              </p>
            ) : null}

            {results.isError ? (
              <SearchEmptyState
                params={params}
                isError
                onRetry={() => results.refetch()}
                onChange={updateFilters}
                onClearFilters={() => updateFilters(clearFilters(params))}
              />
            ) : isEmpty ? (
              <SearchEmptyState
                params={params}
                onChange={updateFilters}
                onClearFilters={() => updateFilters(clearFilters(params))}
                categoryName={selectedCategory?.name ?? null}
              />
            ) : (
              <>
                <div
                  className={cn(
                    'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4',
                    // Dim, do not blank, while a filter change is in flight.
                    results.isFetching && listings.length > 0 && 'opacity-60 transition-opacity'
                  )}
                >
                  {isInitialLoad
                    ? Array.from({ length: SEARCH_PAGE_SIZE / 2 }, (_, index) => (
                        <ListingCardSkeleton key={index} />
                      ))
                    : listings.map((listing, index) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          priority={index < 4}
                          highlighted={highlightedId === listing.id}
                          onHoverChange={setHighlightedId}
                        />
                      ))}
                </div>

                {hasMore ? (
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="secondary"
                      size="lg"
                      loading={results.isFetching}
                      onClick={() => goToPage(params.page + 1)}
                    >
                      Prikaži još
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Sticky, full window height minus the header (doc 03 §3.1). */}
        {isDesktopWide ? (
          <aside className="sticky top-[160px] h-[calc(100vh-160px)] w-[32%] lg:top-[120px] lg:h-[calc(100vh-120px)]">{mapPanel}</aside>
        ) : null}

        {isTablet && tabletView === 'map' ? (
          <div className="h-[calc(100vh-160px)] w-full">{mapPanel}</div>
        ) : null}
      </div>

      {!isDesktopWide && !isTablet ? (
        <MobileMapOverlay
          open={params.mapOpen}
          onOpenChange={(open) => updateFilters({ mapOpen: open })}
        >
          {mapPanel}
        </MobileMapOverlay>
      ) : null}
    </div>
  )
}

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border-none px-3.5 py-1.5 text-[13px] font-medium transition-colors',
        active ? 'bg-brand-500 text-white' : 'bg-transparent text-zinc-600 hover:bg-muted'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/**
 * Phones get the map as a full-screen overlay, opened and closed by a single
 * floating button (doc 03 §3.3). Its open state lives in the URL, so the back
 * button closes it.
 */
function MobileMapOverlay({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          'fixed left-1/2 z-40 inline-flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border-none bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-lg md:hidden',
          open
            ? 'bottom-[calc(16px+env(safe-area-inset-bottom))] z-[600]'
            : 'bottom-[calc(72px+env(safe-area-inset-bottom))]'
        )}
      >
        {open ? (
          <>
            <ListIcon className="size-4" aria-hidden />
            Lista
          </>
        ) : (
          <>
            <MapIcon className="size-4" aria-hidden />
            Mapa
          </>
        )}
      </button>

      {open ? <div className="fixed inset-0 z-[550] md:hidden">{children}</div> : null}
    </>
  )
}
