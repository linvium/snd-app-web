'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PackageIcon, SearchIcon, XIcon } from 'lucide-react'

import DateRangePicker from '@/components/search/DateRangePicker'
import { useCategorySuggest } from '@/hooks/categories'
import { findCity, searchCities } from '@/lib/geo'
import {
  filterPopularSearchTerms,
  formatDateRange,
  nextSearchBarSegment,
  searchBarDividerHidden,
  searchSubmitButtonLayoutClass,
} from '@/lib/search'
import { cn } from '@/lib/utils'
import type { SearchParams } from '@/types/search'

interface HeaderSearchBarProps {
  params: SearchParams
  onSubmit: (changes: Partial<SearchParams>) => void
  /** Mobile taps do not edit in place — they open the full-screen modal (§5.1). */
  onOpenMobileModal: () => void
  /**
   * One-line variant for the manager's 64px top bar: the query segment and the
   * submit button only, at 40px. City and dates stay reachable through the
   * full bar on /search, which is where a search actually gets refined.
   */
  compact?: boolean
}

type Segment = 'q' | 'city' | 'dates'

const SEGMENT_LABEL = 'text-xs font-semibold leading-none text-card-foreground'
const SEGMENT_VALUE =
  'w-full min-w-0 truncate border-none bg-transparent p-0 text-sm leading-snug outline-none placeholder:text-muted-foreground'
const SEARCH_COLUMN = 'relative z-10 flex min-w-0 flex-1 basis-0'
const SEARCH_FIELD =
  'flex min-w-0 cursor-pointer flex-col justify-center gap-1.5 py-3.5 text-left'
const CLEAR_BUTTON =
  'absolute top-1/2 right-3 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-none bg-zinc-200 text-zinc-600 hover:bg-zinc-300'

/**
 * The compact search bar that rides in the header on every page but the home
 * page (doc 03 §4) — a new search has to be startable from wherever the user
 * is. On desktop (lg+) it sits in the same row as the logo; on smaller screens
 * it stays on the row below. On desktop each segment opens its own panel; on
 * mobile the whole thing is one field that opens the modal.
 */
export default function HeaderSearchBar({
  params,
  onSubmit,
  onOpenMobileModal,
  compact = false,
}: HeaderSearchBarProps) {
  const [open, setOpen] = useState<Segment | null>(null)
  const [hovered, setHovered] = useState<Segment | null>(null)
  const [query, setQuery] = useState(params.q ?? '')
  const [draftCategory, setDraftCategory] = useState(params.category)
  const [cityTerm, setCityTerm] = useState(params.city ?? '')
  const [draftCity, setDraftCity] = useState(params.city)
  const [draftLat, setDraftLat] = useState(params.lat)
  const [draftLng, setDraftLng] = useState(params.lng)
  const [draftFrom, setDraftFrom] = useState(params.from)
  const [draftTo, setDraftTo] = useState(params.to)
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false })
  const rootRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const queryRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const qSegRef = useRef<HTMLDivElement>(null)
  const citySegRef = useRef<HTMLDivElement>(null)
  const datesSegRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(params.q ?? '')
    setDraftCategory(params.category)
    setDraftCity(params.city)
    setDraftLat(params.lat)
    setDraftLng(params.lng)
    setDraftFrom(params.from)
    setDraftTo(params.to)
  }, [params.q, params.category, params.city, params.lat, params.lng, params.from, params.to])

  useEffect(() => {
    if (open !== 'city') setCityTerm(params.city ?? '')
  }, [params.city, open])

  useEffect(() => {
    if (open === 'q') queryRef.current?.focus()
    if (open === 'city') cityRef.current?.focus()
  }, [open])

  useLayoutEffect(() => {
    const bar = barRef.current
    const segmentEl =
      open === 'q' ? qSegRef.current : open === 'city' ? citySegRef.current : open === 'dates' ? datesSegRef.current : null
    if (!bar || !segmentEl) {
      setPill((current) => ({ ...current, visible: false }))
      return
    }
    const barRect = bar.getBoundingClientRect()
    const rect = segmentEl.getBoundingClientRect()
    setPill({
      left: rect.left - barRect.left,
      width: rect.width,
      visible: true,
    })
  }, [open, query, cityTerm, draftCity, draftFrom, draftTo])

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

  const dateLabel = formatDateRange(draftFrom, draftTo)
  const popularMatches = useMemo(() => filterPopularSearchTerms(query), [query])
  const { data: categorySuggestions = [] } = useCategorySuggest(query)
  const cityMatches = useMemo(() => searchCities(cityTerm), [cityTerm])

  const goToSegment = (segment: Segment) => {
    setOpen(segment)
  }

  const commitSearch = () => {
    onSubmit({
      q: query.trim() || null,
      category: draftCategory,
      city: draftCity,
      lat: draftLat,
      lng: draftLng,
      from: draftFrom,
      to: draftTo,
    })
    setOpen(null)
  }

  const advanceFromQuery = () => {
    if (compact) {
      commitSearch()
      return
    }
    const next = nextSearchBarSegment('q')
    if (next === 'city') goToSegment('city')
  }

  const pickPopularTerm = (term: string) => {
    setQuery(term)
    setDraftCategory(null)
    if (compact) {
      onSubmit({ q: term, category: null })
      setOpen(null)
      return
    }
    goToSegment('city')
  }

  const pickCategory = (name: string, slug: string) => {
    setQuery(name)
    setDraftCategory(slug)
    if (compact) {
      onSubmit({ q: name, category: slug })
      setOpen(null)
      return
    }
    goToSegment('city')
  }

  const pickCity = (name: string, lat: number, lng: number) => {
    setCityTerm(name)
    setDraftCity(name)
    setDraftLat(lat)
    setDraftLng(lng)
    goToSegment('dates')
  }

  const columnClass = (segment: Segment) =>
    cn(
      SEARCH_COLUMN,
      'rounded-full transition-[background-color,box-shadow] duration-300 ease-in-out',
      open === segment && 'z-30',
      open !== null &&
        open !== segment &&
        hovered === segment &&
        'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-zinc-300/70',
      open === null && hovered === segment && 'bg-zinc-100'
    )

  return (
    <>
      {/* Mobile: a single field, nothing editable in place. */}
      <button
        type="button"
        onClick={onOpenMobileModal}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2.5 rounded-full border border-border bg-card px-4 text-left shadow-sm md:hidden',
          compact ? 'h-10' : 'h-12'
        )}
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
        className="relative hidden w-full md:block"
      >
        <div
          ref={barRef}
          className={cn(
            'relative flex items-stretch rounded-full border border-border transition-colors duration-300 ease-in-out',
            compact ? 'h-10' : 'h-16',
            open && !compact
              ? 'border-transparent bg-zinc-200 shadow-none'
              : compact
                ? 'bg-muted/60'
                : 'bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]'
          )}
        >
          <div
            aria-hidden
            data-testid="search-focus-pill"
            className="pointer-events-none absolute top-0 bottom-0 z-20 rounded-full bg-card shadow-[0_6px_20px_rgba(0,0,0,0.12)] transition-opacity duration-200 ease-in-out"
            style={{
              left: pill.left,
              width: pill.width,
              opacity: pill.visible && !compact ? 1 : 0,
            }}
          />

          <div
            ref={qSegRef}
            data-testid="search-segment-q"
            className={cn(
              columnClass('q'),
              SEARCH_FIELD,
              compact ? 'gap-0 px-4 py-0' : 'px-8',
              open === 'q' && query && 'pr-12'
            )}
            onMouseEnter={() => setHovered('q')}
            onClick={() => {
              goToSegment('q')
              queryRef.current?.focus()
            }}
          >
            {compact ? null : <span className={SEGMENT_LABEL}>Šta tražiš?</span>}
            <input
              ref={queryRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => goToSegment('q')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  advanceFromQuery()
                }
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
                className={CLEAR_BUTTON}
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          {compact ? (
            <button
              type="button"
              onClick={commitSearch}
              aria-label="Pretraži"
              data-testid="search-submit-compact"
              className="relative z-30 my-1 mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-brand-500 text-white transition-colors hover:bg-brand-600"
            >
              <SearchIcon className="size-4 shrink-0" aria-hidden />
            </button>
          ) : (
            <>
          <Divider hidden={searchBarDividerHidden(open, hovered, 'after-q')} />

          <div
            ref={citySegRef}
            data-testid="search-segment-city"
            className={cn(
              columnClass('city'),
              SEARCH_FIELD,
              'px-8',
              open === 'city' && (cityTerm || draftCity) && 'pr-12'
            )}
            onMouseEnter={() => setHovered('city')}
            onClick={() => {
              goToSegment('city')
              cityRef.current?.focus()
            }}
          >
            <span className={SEGMENT_LABEL}>Gde?</span>
            <input
              ref={cityRef}
              type="text"
              value={open === 'city' ? cityTerm : (draftCity ?? '')}
              onChange={(event) => setCityTerm(event.target.value)}
              onFocus={() => goToSegment('city')}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                const match = cityMatches[0]
                if (match) pickCity(match.name, match.lat, match.lng)
                else goToSegment('dates')
              }}
              placeholder="Dodaj lokaciju"
              className={cn(
                SEGMENT_VALUE,
                (open === 'city' ? cityTerm : draftCity)
                  ? 'font-medium text-card-foreground'
                  : 'text-muted-foreground'
              )}
            />
            {open === 'city' && (cityTerm || draftCity) ? (
              <button
                type="button"
                aria-label="Obriši lokaciju"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation()
                  setCityTerm('')
                  setDraftCity(null)
                  const city = findCity(draftCity)
                  setDraftLat(city ? null : draftLat)
                  setDraftLng(city ? null : draftLng)
                  cityRef.current?.focus()
                }}
                className={CLEAR_BUTTON}
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>

          <Divider hidden={searchBarDividerHidden(open, hovered, 'after-city')} />

          <div
            ref={datesSegRef}
            data-testid="search-segment-dates"
            className={cn(columnClass('dates'), 'basis-5 items-center')}
            onMouseEnter={() => setHovered('dates')}
          >
            <button
              type="button"
              aria-expanded={open === 'dates'}
              onClick={() => goToSegment('dates')}
              className={cn(SEARCH_FIELD, 'flex-1 border-none bg-transparent pl-8 pr-3')}
            >
              <span className={SEGMENT_LABEL}>Datumi</span>
              <span
                className={cn(
                  'w-full min-w-0 truncate text-sm leading-snug',
                  dateLabel ? 'font-medium text-card-foreground' : 'text-muted-foreground'
                )}
              >
                {dateLabel ?? 'Dodaj datume'}
              </span>
            </button>

            <button
              type="button"
              onClick={commitSearch}
              aria-label="Pretraži"
              className={cn(
                'relative z-30 my-2 mr-2 flex shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-brand-500 text-white transition-all duration-300 ease-in-out hover:bg-brand-600',
                searchSubmitButtonLayoutClass(Boolean(open))
              )}
            >
              <SearchIcon className="size-5 shrink-0" aria-hidden />
              <span
                className={cn(
                  'overflow-hidden text-sm font-semibold whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out',
                  open ? 'max-w-[88px] opacity-100' : 'w-0 max-w-0 opacity-0'
                )}
              >
                Pretraži
              </span>
            </button>
          </div>
            </>
          )}
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
                  Nema predloga — pritisni Enter za lokaciju, ili Pretraži
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
                    selected={draftCity === city.name}
                    onSelect={() => pickCity(city.name, city.lat, city.lng)}
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
          <SuggestionsPanel className="right-0 left-auto w-[min(560px,calc(100vw-2rem))] px-5">
            <DateRangePicker
              layout="split"
              from={draftFrom}
              to={draftTo}
              monthsAhead={6}
              onChange={(from, to) => {
                setDraftFrom(from)
                setDraftTo(to)
              }}
            />
            {draftFrom ? (
              <button
                type="button"
                onClick={() => {
                  setDraftFrom(null)
                  setDraftTo(null)
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
