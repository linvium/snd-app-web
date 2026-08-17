'use client'

import Link from 'next/link'
import {
  CalendarOffIcon,
  PackageOpenIcon,
  SearchXIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'

import ListingCard, { ListingCardSkeleton } from '@/components/listings/ListingCard'
import { Button } from '@/components/ui/button'
import { useSuggestedListings } from '@/hooks/search'
import { countActiveFilters, priceFilterLabel, radiusFilterLabel } from '@/lib/search'
import { DEFAULT_RADIUS_KM, type SearchParams } from '@/types/search'

interface SearchEmptyStateProps {
  params: SearchParams
  isError?: boolean
  onRetry?: () => void
  onChange: (changes: Partial<SearchParams>) => void
  onClearFilters: () => void
  categoryName?: string | null
}

interface EmptyCopy {
  icon: LucideIcon
  title: string
  body: string
}

/**
 * Which empty state applies is decided by the narrowest thing the user did
 * last, because that is the one they will want to undo (doc 03 §10).
 */
function pickCopy(params: SearchParams, hasFilters: boolean): EmptyCopy {
  if (params.q) {
    return {
      icon: SearchXIcon,
      title: `Nismo našli ništa za „${params.q}”`,
      body: 'Probaj drugu reč ili proširi područje pretrage.',
    }
  }
  if (params.from && params.to) {
    return {
      icon: CalendarOffIcon,
      title: 'Ništa nije slobodno tih dana',
      body: 'Probaj druge datume ili pogledaj šta je dostupno bez datuma.',
    }
  }
  if (hasFilters) {
    return {
      icon: SlidersHorizontalIcon,
      title: 'Nema rezultata sa ovim filterima',
      body: 'Ukloni neki od filtera ispod da bi video više predmeta.',
    }
  }
  return {
    icon: PackageOpenIcon,
    title: 'Još nema predmeta u ovoj kategoriji',
    body: 'Budi prvi koji će ovde nešto objaviti.',
  }
}

export default function SearchEmptyState({
  params,
  isError = false,
  onRetry,
  onChange,
  onClearFilters,
  categoryName,
}: SearchEmptyStateProps) {
  const activeFilters = countActiveFilters(params)
  const hasFilters = activeFilters > 0
  const copy = isError
    ? {
        icon: TriangleAlertIcon,
        title: 'Nešto je krenulo naopako',
        body: 'Pokušaj ponovo za koji trenutak.',
      }
    : pickCopy(params, hasFilters)

  const Icon = copy.icon

  return (
    <div className="flex flex-col gap-10 py-6">
      <div className="flex flex-col items-center gap-3 px-4 text-center">
        <Icon className="size-16 text-zinc-300" strokeWidth={1.25} aria-hidden />
        <h2 className="text-lg font-semibold text-card-foreground">{copy.title}</h2>
        <p className="max-w-md text-sm text-zinc-500">{copy.body}</p>

        {/* Every empty state offers a way out — never a dead end (doc 10 §8.6). */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {isError ? (
            <Button onClick={onRetry}>Pokušaj ponovo</Button>
          ) : params.q ? (
            <>
              {params.radiusKm !== 50 && params.radiusKm > 0 ? (
                <Button onClick={() => onChange({ radiusKm: 50 })}>Proširi na 50 km</Button>
              ) : null}
              {hasFilters ? (
                <Button variant="secondary" onClick={onClearFilters}>
                  Obriši filtere
                </Button>
              ) : null}
            </>
          ) : params.from && params.to ? (
            <Button onClick={() => onChange({ from: null, to: null })}>Obriši datume</Button>
          ) : hasFilters ? (
            <Button onClick={onClearFilters}>Obriši sve filtere</Button>
          ) : (
            <Button asChild>
              <Link href="/listings/new">Objavi predmet</Link>
            </Button>
          )}
        </div>

        {/* With several filters on, naming them individually is faster than
            guessing which one is too tight (doc 03 §10). */}
        {!isError && hasFilters ? (
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-2 p-0">
            {params.category ? (
              <FilterPill
                label={categoryName ?? params.category}
                onRemove={() => onChange({ category: null })}
              />
            ) : null}
            {params.priceMin !== null || params.priceMax !== null ? (
              <FilterPill
                label={priceFilterLabel(params)}
                onRemove={() => onChange({ priceMin: null, priceMax: null })}
              />
            ) : null}
            {params.radiusKm !== DEFAULT_RADIUS_KM ? (
              <FilterPill
                label={radiusFilterLabel(params.radiusKm)}
                onRemove={() => onChange({ radiusKm: DEFAULT_RADIUS_KM })}
              />
            ) : null}
          </ul>
        ) : null}
      </div>

      {!isError ? <SuggestedListings lat={params.lat} lng={params.lng} /> : null}
    </div>
  )
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-muted"
      >
        {label}
        <XIcon className="size-3.5" aria-label="Ukloni filter" />
      </button>
    </li>
  )
}

function SuggestedListings({ lat, lng }: { lat: number | null; lng: number | null }) {
  const { data, isLoading } = useSuggestedListings(lat, lng)

  if (!isLoading && (!data || data.length === 0)) return null

  return (
    <section className="border-t border-border px-4 pt-8">
      <h3 className="mb-4 text-base font-semibold text-card-foreground">Možda te zanima</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => <ListingCardSkeleton key={index} />)
          : data?.slice(0, 4).map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} priority={index < 4} />
            ))}
      </div>
    </section>
  )
}
