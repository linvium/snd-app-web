'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { PackageIcon, SearchIcon, XIcon } from 'lucide-react'

import DateRangeCalendar from '@/components/search/DateRangeCalendar'
import { useCategorySuggest } from '@/hooks/categories'
import { findCity, searchCities } from '@/lib/geo'
import {
  filterPopularSearchTerms,
  formatDateRange,
  searchBarDividerHidden,
} from '@/lib/search'
import { cn } from '@/lib/utils'
import type { SearchParams } from '@/types/search'

interface HeaderSearchBarProps {
  params: SearchParams
  onSubmit: (changes: Partial<SearchParams>) => void
  /** Mobile taps do not edit in place — they open the full-screen modal (§5.1). */
  onOpenMobileModal: () => void
}

type Segment = 'q' | 'city' | 'dates'

const SEGMENT_LABEL = 'text-xs font-semibold leading-none text-card-foreground'
const SEGMENT_VALUE =
  'w-full min-w-0 truncate border-none bg-transparent p-0 text-sm leading-snug outline-none placeholder:text-muted-foreground'
const SEGMENT_BASE =
  'relative z-10 flex min-w-0 flex-1 basis-0 cursor-pointer flex-col justify-center gap-1.5 px-8 py-3.5 text-left'

/**
 * The compact search bar that rides in the header on every page but the home
 * page (doc 03 §4) — a new search has to be startable from wherever the user
 * is. On desktop each segment opens its own panel; on mobile the whole thing
 * is one field that opens the modal.
 */
export default function HeaderSearchBar({
  params,
  onSubmit,
  onOpenMobileModal,
}: HeaderSearchBarProps) {
  const [open, setOpen] = useState<Segment | null>(null)
  const [hovered, setHovered] = useState<Segment | null>(null)
  const [query, setQuery] = useState(params.q ?? '')
  const [cityTerm, setCityTerm] = useState(params.city ?? '')
  const rootRef = useRef<HTMLDivElement>(null)
  const queryRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(params.q ?? '')
  }, [params.q])

  useEffect(() => {
    if (open !== 'city') setCityTerm(params.city ?? '')
  }, [params.city, open])

  useEffect(() => {
    if (open === 'q') queryRef.current?.focus()
    if (open === 'city') cityRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const dateLabel = formatDateRange(params.from, params.to)
  const popularMatches = useMemo(() => filterPopularSearchTerms(query), [query])
  const { data: categorySuggestions = [] } = useCategorySuggest(query)
  const cityMatches = useMemo(() => searchCities(cityTerm), [cityTerm])

  const submitQuery = (nextQuery = query) => {
    onSubmit({ q: nextQuery.trim() || null })
    setOpen(null)
  }

  const pickPopularTerm = (term: string) => {
    setQuery(term)
    onSubmit({ q: term })
    setOpen(null)
  }

  const pickCategory = (name: string, slug: string) => {
    setQuery(name)
    onSubmit({ q: name, category: slug })
    setOpen(null)
  }

  const segmentClass = (segment: Segment) =>
    cn(
      SEGMENT_BASE,
      'rounded-full transition-[background-color,box-shadow,opacity] duration-200 ease-out',
      open === segment && 'bg-card shadow-[0_6px_20px_rgba(0,0,0,0.12)]',
      open !== null && open !== segment && hovered === segment && 'bg-zinc-300/70',
      open === null && hovered === segment && 'bg-zinc-100'
    )

  return (
    <>
      {/* Mobile: a single field, nothing editable in place. */}
      <button
        type="button"
        onClick={onOpenMobileModal}
        className="flex h-12 w-full cursor-pointer items-center gap-2.5 rounded-full border border-border bg-card px-4 text-left shadow-sm md:hidden"
      >
        <SearchIcon className="size-[18px] shrink-0 text-zinc-500" aria-hidden />
        <span
          className={cn(
            'truncate text-sm',
            params.q ? 'font-medium text-card-foreground' : 'text-muted-foreground'
          )}
        >
          {params.q ?? 'Šta tražiš?'}
        </span>
        {params.city || dateLabel ? (
          <span className="ml-auto shrink-0 truncate text-xs text-zinc-500">
            {[params.city, dateLabel].filter(Boolean).join(' · ')}
          </span>
        ) : null}
      </button>

      <div
        ref={rootRef}
        onMouseLeave={() => setHovered(null)}
        className="relative mx-auto hidden w-full max-w-[900px] md:block"
      >
        <div
          className={cn(
            'flex h-16 items-stretch rounded-full border border-border transition-colors duration-200 ease-out',
            open
              ? 'border-transparent bg-zinc-200 shadow-none'
              : 'bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]'
          )}
        >
          <div
            className={segmentClass('q')}
            onMouseEnter={() => setHovered('q')}
            onClick={() => {
              setOpen('q')
              queryRef.current?.focus()
            }}
          >
            <span className={SEGMENT_LABEL}>Šta tražiš?</span>
            <div className="flex min-w-0 items-center gap-1">
              <input
                ref={queryRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setOpen('q')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitQuery()
                }}
                placeholder="Pretraži predmete"
                className={cn(
                  SEGMENT_VALUE,
                  query ? 'font-medium text-card-foreground' : 'text-muted-foreground'
                )}
              />
              {open === 'q' && query ? (
                <button
                  type="button"
                  aria-label="Obriši pretragu"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation()
                    setQuery('')
                    queryRef.current?.focus()
                  }}
                  className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                >
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          <Divider hidden={searchBarDividerHidden(open, hovered, 'after-q')} />

          <div
            className={segmentClass('city')}
            onMouseEnter={() => setHovered('city')}
            onClick={() => {
              setOpen('city')
              cityRef.current?.focus()
            }}
          >
            <span className={SEGMENT_LABEL}>Gde?</span>
            <div className="flex min-w-0 items-center gap-1">
              <input
                ref={cityRef}
                type="text"
                value={open === 'city' ? cityTerm : (params.city ?? '')}
                onChange={(event) => setCityTerm(event.target.value)}
                onFocus={() => setOpen('city')}
                placeholder="Dodaj lokaciju"
                className={cn(
                  SEGMENT_VALUE,
                  (open === 'city' ? cityTerm : params.city)
                    ? 'font-medium text-card-foreground'
                    : 'text-muted-foreground'
                )}
              />
              {open === 'city' && (cityTerm || params.city) ? (
                <button
                  type="button"
                  aria-label="Obriši lokaciju"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation()
                    setCityTerm('')
                    const city = findCity(params.city)
                    onSubmit({
                      city: null,
                      lat: city ? null : params.lat,
                      lng: city ? null : params.lng,
                    })
                    cityRef.current?.focus()
                  }}
                  className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                >
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          <Divider hidden={searchBarDividerHidden(open, hovered, 'after-city')} />

          <button
            type="button"
            aria-expanded={open === 'dates'}
            onMouseEnter={() => setHovered('dates')}
            onClick={() => setOpen('dates')}
            className={cn(segmentClass('dates'), 'border-none')}
          >
            <span className={SEGMENT_LABEL}>Datumi</span>
            <span
              className={cn(
                'truncate text-sm leading-snug',
                dateLabel ? 'font-medium text-card-foreground' : 'text-muted-foreground'
              )}
            >
              {dateLabel ?? 'Dodaj datume'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => submitQuery()}
            aria-label="Pretraži"
            className={cn(
              'my-2 mr-2 ml-1 flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-brand-500 text-white transition-all duration-200 ease-out hover:bg-brand-600',
              open ? 'h-12 px-4' : 'size-12'
            )}
          >
            <SearchIcon className="size-5 shrink-0" aria-hidden />
            <span
              className={cn(
                'overflow-hidden text-sm font-semibold whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out',
                open ? 'max-w-[88px] opacity-100' : 'max-w-0 opacity-0'
              )}
            >
              Pretraži
            </span>
          </button>
        </div>

        {open === 'q' ? (
          <SuggestionsPanel>
            <p className="px-5 pb-2 text-xs font-semibold text-card-foreground">
              {query.trim() ? 'Predlozi' : 'Popularno sada'}
            </p>
            <ul className="m-0 max-h-80 list-none overflow-y-auto p-0">
              {popularMatches.map((term) => (
                <li key={term}>
                  <SuggestionRow
                    title={term}
                    subtitle="Popularna pretraga"
                    icon={
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-100">
                        <SearchIcon className="size-5 text-zinc-600" aria-hidden />
                      </span>
                    }
                    onSelect={() => pickPopularTerm(term)}
                  />
                </li>
              ))}
              {categorySuggestions.map((category) => (
                <li key={category.id}>
                  <SuggestionRow
                    title={category.name}
                    subtitle={category.full_path}
                    icon={
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50">
                        <PackageIcon className="size-5 text-brand-600" aria-hidden />
                      </span>
                    }
                    onSelect={() => pickCategory(category.name, category.slug)}
                  />
                </li>
              ))}
              {query.trim() && popularMatches.length === 0 && categorySuggestions.length === 0 ? (
                <li className="px-5 py-3 text-sm text-muted-foreground">
                  Nema predloga — pritisni Enter za pretragu „{query.trim()}“
                </li>
              ) : null}
            </ul>
          </SuggestionsPanel>
        ) : null}

        {open === 'city' ? (
          <SuggestionsPanel className="left-[28%]">
            <p className="px-5 pb-2 text-xs font-semibold text-card-foreground">Gradovi</p>
            <ul className="m-0 max-h-80 list-none overflow-y-auto p-0">
              {cityMatches.map((city) => (
                <li key={city.name}>
                  <SuggestionRow
                    title={city.name}
                    subtitle="Srbija"
                    selected={params.city === city.name}
                    onSelect={() => {
                      setCityTerm(city.name)
                      onSubmit({ city: city.name, lat: city.lat, lng: city.lng })
                      setOpen('dates')
                    }}
                  />
                </li>
              ))}
              {cityMatches.length === 0 ? (
                <li className="px-5 py-3 text-sm text-muted-foreground">Nema takvog grada.</li>
              ) : null}
            </ul>
          </SuggestionsPanel>
        ) : null}

        {open === 'dates' ? (
          <SuggestionsPanel className="right-0 left-auto w-[340px] px-4">
            <DateRangeCalendar
              from={params.from}
              to={params.to}
              monthsAhead={6}
              onChange={(from, to) => {
                onSubmit({ from, to })
                if (from && to) setOpen(null)
              }}
            />
            {params.from ? (
              <button
                type="button"
                onClick={() => {
                  onSubmit({ from: null, to: null })
                }}
                className="mt-1 w-full cursor-pointer border-none bg-transparent p-2 text-[13px] font-semibold text-brand-600 hover:underline"
              >
                Obriši datume
              </button>
            ) : null}
          </SuggestionsPanel>
        ) : null}
      </div>
    </>
  )
}

function Divider({ hidden }: { hidden: boolean }) {
  return (
    <span
      className={cn(
        'my-4 w-px shrink-0 bg-border transition-opacity duration-150 ease-out',
        hidden && 'opacity-0'
      )}
      aria-hidden
    />
  )
}

function SuggestionsPanel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'absolute top-[calc(100%+12px)] left-0 z-50 w-[min(420px,100%)] rounded-[32px] border border-border bg-card py-4 shadow-[0_16px_40px_rgba(0,0,0,0.16)]',
        className
      )}
    >
      {children}
    </div>
  )
}

function SuggestionRow({
  title,
  subtitle,
  icon,
  selected = false,
  onSelect,
}: {
  title: string
  subtitle: string
  icon?: React.ReactNode
  selected?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-5 py-3 text-left hover:bg-muted',
        selected && 'bg-brand-50'
      )}
    >
      {icon}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-card-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  )
}
