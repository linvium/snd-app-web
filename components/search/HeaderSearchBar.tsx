'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarIcon, MapPinIcon, SearchIcon } from 'lucide-react'

import DateRangeCalendar from '@/components/search/DateRangeCalendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { findCity, searchCities } from '@/lib/geo'
import { formatDateRange } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { SearchParams } from '@/types/search'

interface HeaderSearchBarProps {
  params: SearchParams
  onSubmit: (changes: Partial<SearchParams>) => void
  /** Mobile taps do not edit in place — they open the full-screen modal (§5.1). */
  onOpenMobileModal: () => void
}

type Segment = 'q' | 'city' | 'dates' | null

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
  const [open, setOpen] = useState<Segment>(null)
  const [query, setQuery] = useState(params.q ?? '')
  const [cityTerm, setCityTerm] = useState('')
  const queryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(params.q ?? '')
  }, [params.q])

  useEffect(() => {
    if (open === 'q') queryRef.current?.focus()
  }, [open])

  const dateLabel = formatDateRange(params.from, params.to)

  const submitQuery = () => {
    onSubmit({ q: query.trim() || null })
    setOpen(null)
  }

  return (
    <>
      {/* Mobile: a single field, nothing editable in place. */}
      <button
        type="button"
        onClick={onOpenMobileModal}
        className="flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-full border border-border bg-card px-4 text-left shadow-sm md:hidden"
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

      {/* Desktop: three segments, each opening the panel that edits it. */}
      <div className="hidden h-11 items-stretch rounded-full border border-border bg-card shadow-sm md:flex">
        <Popover open={open === 'q'} onOpenChange={(next) => setOpen(next ? 'q' : null)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-expanded={open === 'q'}
              className="min-w-[140px] cursor-pointer rounded-l-full border-none bg-transparent px-4 text-left text-sm hover:bg-muted"
            >
              <span className={cn(params.q ? 'font-medium' : 'text-muted-foreground')}>
                {params.q ?? 'Šta tražiš?'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <label className="mb-1.5 block text-[13px] font-medium text-zinc-700">
              Pojam pretrage
            </label>
            <input
              ref={queryRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitQuery()
              }}
              placeholder="npr. bušilica"
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100"
            />
            <Button size="sm" className="mt-3 w-full" onClick={submitQuery}>
              Primeni
            </Button>
          </PopoverContent>
        </Popover>

        <span className="my-2 w-px bg-border" aria-hidden />

        <Popover open={open === 'city'} onOpenChange={(next) => setOpen(next ? 'city' : null)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-expanded={open === 'city'}
              className="flex min-w-[120px] cursor-pointer items-center gap-1.5 border-none bg-transparent px-4 text-left text-sm hover:bg-muted"
            >
              <MapPinIcon className="size-4 text-zinc-400" aria-hidden />
              <span className={cn(params.city ? 'font-medium' : 'text-muted-foreground')}>
                {params.city ?? 'Gde?'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="max-h-80 w-72 overflow-y-auto p-2">
            <input
              type="search"
              value={cityTerm}
              onChange={(event) => setCityTerm(event.target.value)}
              placeholder="Pretraži gradove"
              className="mb-2 h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100"
            />
            <div className="flex flex-col">
              {searchCities(cityTerm).map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => {
                    onSubmit({ city: city.name, lat: city.lat, lng: city.lng })
                    setOpen(null)
                  }}
                  className={cn(
                    'cursor-pointer rounded-md border-none bg-transparent px-3 py-2 text-left text-sm hover:bg-muted',
                    params.city === city.name && 'bg-brand-50 font-semibold text-brand-700'
                  )}
                >
                  {city.name}
                </button>
              ))}
            </div>
            {params.city ? (
              <button
                type="button"
                onClick={() => {
                  const city = findCity(params.city)
                  onSubmit({ city: null, lat: city ? null : params.lat, lng: city ? null : params.lng })
                  setOpen(null)
                }}
                className="mt-2 w-full cursor-pointer border-none bg-transparent p-2 text-[13px] font-semibold text-brand-600 hover:underline"
              >
                Poništi grad
              </button>
            ) : null}
          </PopoverContent>
        </Popover>

        <span className="my-2 w-px bg-border" aria-hidden />

        <Popover open={open === 'dates'} onOpenChange={(next) => setOpen(next ? 'dates' : null)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-expanded={open === 'dates'}
              className="flex min-w-[130px] cursor-pointer items-center gap-1.5 border-none bg-transparent px-4 text-left text-sm hover:bg-muted"
            >
              <CalendarIcon className="size-4 text-zinc-400" aria-hidden />
              <span className={cn(dateLabel ? 'font-medium' : 'text-muted-foreground')}>
                {dateLabel ?? 'Datumi'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="max-h-[70vh] w-80 overflow-y-auto">
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
                  setOpen(null)
                }}
                className="mt-3 w-full cursor-pointer border-none bg-transparent p-2 text-[13px] font-semibold text-brand-600 hover:underline"
              >
                Obriši datume
              </button>
            ) : null}
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={submitQuery}
          aria-label="Pretraži"
          className="my-1 mr-1 ml-1 grid w-10 cursor-pointer place-items-center rounded-full border-none bg-brand-500 text-white hover:bg-brand-600"
        >
          <SearchIcon className="size-[18px]" aria-hidden />
        </button>
      </div>
    </>
  )
}
