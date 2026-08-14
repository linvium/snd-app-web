'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarIcon, ChevronLeftIcon, MapPinIcon, SearchIcon, XIcon } from 'lucide-react'

import DateRangeCalendar from '@/components/search/DateRangeCalendar'
import { useFocusTrap } from '@/components/search/useFocusTrap'
import { Button } from '@/components/ui/button'
import { useGeolocation, useSearchCount } from '@/hooks/search'
import { findCity, searchCities } from '@/lib/geo'
import { formatDateRange, resolveSearchCenter, type Coordinates } from '@/lib/search'
import { cn } from '@/lib/utils'
import type { SearchParams } from '@/types/search'

const POPULAR_TERMS = ['bušilica', 'šator', 'prikolica', 'dron', 'kosačica', 'projektor']

interface MobileSearchModalProps {
  open: boolean
  /** The search currently on screen — the modal edits a copy of it. */
  params: SearchParams
  profileCoords?: Coordinates | null
  onClose: () => void
  onSubmit: (params: SearchParams) => void
}

type Layer = 'main' | 'city' | 'dates'

/**
 * The full-screen mobile search (doc 03 §5).
 *
 * The rule that shapes everything here: the modal edits a draft, and the draft
 * only reaches the page when "Pretraži" is pressed. Closing by ✕, Esc or a
 * downward drag leaves the results and the URL exactly as they were.
 */
export default function MobileSearchModal({
  open,
  params,
  profileCoords = null,
  onClose,
  onSubmit,
}: MobileSearchModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const queryInputRef = useRef<HTMLInputElement>(null)
  const cityInputRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<SearchParams>(params)
  const [layer, setLayer] = useState<Layer>('main')
  const [cityTerm, setCityTerm] = useState('')
  const [dragOffset, setDragOffset] = useState(0)
  const dragStart = useRef<number | null>(null)

  const geolocation = useGeolocation()

  // Reopening starts from whatever is on screen, discarding any abandoned edit.
  useEffect(() => {
    if (open) {
      setDraft(params)
      setLayer('main')
      setCityTerm('')
      setDragOffset(0)
      geolocation.reset()
    }
    // `params` is intentionally not a dependency: re-syncing the draft while
    // the modal is open would overwrite what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useFocusTrap(containerRef, open, onClose)

  // The keyboard should be up before the user decides what to do (§5.3).
  useEffect(() => {
    if (!open || layer !== 'main') return
    const timer = setTimeout(() => queryInputRef.current?.focus(), 260)
    return () => clearTimeout(timer)
  }, [open, layer])

  useEffect(() => {
    if (layer === 'city') {
      const timer = setTimeout(() => cityInputRef.current?.focus(), 60)
      return () => clearTimeout(timer)
    }
  }, [layer])

  const { data: count } = useSearchCount(draft, { enabled: open })

  const handleUseMyLocation = useCallback(async () => {
    const coords = await geolocation.request()
    if (!coords) {
      // Refusal is a normal outcome: stay open, explain, and point at the
      // manual way in (§5.4).
      setLayer('city')
      return
    }

    const center = resolveSearchCenter({
      cityName: draft.city,
      userCoords: coords,
      profileCoords,
    })

    setDraft((prev) => ({
      ...prev,
      lat: center?.lat ?? coords.lat,
      lng: center?.lng ?? coords.lng,
    }))
  }, [draft.city, geolocation, profileCoords])

  const commit = () => {
    const city = findCity(draft.city)
    const center = resolveSearchCenter({
      cityName: draft.city,
      userCoords: geolocation.coords,
      profileCoords,
    })

    onSubmit({
      ...draft,
      lat: center?.lat ?? (city ? city.lat : draft.lat),
      lng: center?.lng ?? (city ? city.lng : draft.lng),
      page: 1,
    })
  }

  const onPointerDown = (event: React.PointerEvent) => {
    dragStart.current = event.clientY
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (dragStart.current === null) return
    setDragOffset(Math.max(0, event.clientY - dragStart.current))
  }

  const onPointerUp = () => {
    // Past a fifth of the screen the gesture reads as "put this away".
    if (dragOffset > window.innerHeight * 0.2) {
      onClose()
    }
    dragStart.current = null
    setDragOffset(0)
  }

  if (!open || typeof document === 'undefined') return null

  const dateLabel = formatDateRange(draft.from, draft.to)

  // Portalled to the body: the bar that opens this lives inside the sticky
  // header, whose own z-index would otherwise trap the modal underneath the
  // bottom navigation.
  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Pretraga"
      className="fixed inset-0 z-50 flex flex-col bg-card"
      style={{
        transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
        transition: dragOffset ? 'none' : 'transform 250ms ease-out',
        animation: 'snd-slide-up 250ms ease-out',
      }}
    >
      {layer === 'main' ? (
        <>
          <header
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex touch-none items-center justify-between px-4 pt-3 pb-2"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Zatvori pretragu"
              className="grid size-10 cursor-pointer place-items-center rounded-full border-none bg-transparent text-zinc-700 hover:bg-muted"
            >
              <XIcon className="size-5" aria-hidden />
            </button>
            <span className="mx-auto h-1 w-10 rounded-full bg-zinc-200" aria-hidden />
            <span className="size-10" aria-hidden />
          </header>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <Field label="Šta tražiš?">
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  ref={queryInputRef}
                  type="search"
                  value={draft.q ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, q: event.target.value || null }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commit()
                  }}
                  placeholder="npr. bušilica"
                  // 16px or iOS zooms the page on focus (doc 10 §8.2).
                  className="h-12 w-full rounded-md border border-input bg-card pr-3.5 pl-11 text-base outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100"
                />
              </div>
            </Field>

            <Field label="Gde?">
              <SelectorButton
                icon={<MapPinIcon className="size-[18px] text-zinc-400" aria-hidden />}
                value={draft.city}
                placeholder="Izaberi grad"
                onClick={() => setLayer('city')}
              />
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={geolocation.state === 'pending'}
                className="mt-2 inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-sm font-medium text-brand-600 disabled:opacity-50"
              >
                <span
                  className={cn(
                    'grid size-4 place-items-center rounded-full border-2',
                    geolocation.state === 'granted'
                      ? 'border-brand-500 bg-brand-500'
                      : 'border-zinc-300'
                  )}
                  aria-hidden
                />
                {geolocation.state === 'pending' ? 'Tražim lokaciju…' : 'Koristi moju lokaciju'}
              </button>
              {geolocation.errorMessage ? (
                <p role="alert" className="mt-2 text-[13px] text-destructive">
                  {geolocation.errorMessage}
                </p>
              ) : null}
            </Field>

            <Field label="Kada?">
              <SelectorButton
                icon={<CalendarIcon className="size-[18px] text-zinc-400" aria-hidden />}
                value={dateLabel}
                placeholder="Izaberi datume"
                onClick={() => setLayer('dates')}
              />
            </Field>

            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-card-foreground">Popularno sada</h2>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TERMS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, q: term }))}
                    className="cursor-pointer rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-muted"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  q: null,
                  city: null,
                  lat: null,
                  lng: null,
                  from: null,
                  to: null,
                  category: null,
                  priceMin: null,
                  priceMax: null,
                }))
              }
              className="cursor-pointer border-none bg-transparent p-2 text-sm font-semibold text-zinc-700 underline"
            >
              Obriši sve
            </button>
            {/* Never disabled — an empty search is a legitimate search (§5.3). */}
            <Button size="lg" onClick={commit} className="min-w-[140px]">
              {count === undefined ? 'Pretraži' : `Pretraži (${count})`}
            </Button>
          </footer>
        </>
      ) : null}

      {layer === 'city' ? (
        <LayerScreen title="Gde?" onBack={() => setLayer('main')}>
          <div className="relative mb-3">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-zinc-400"
              aria-hidden
            />
            <input
              ref={cityInputRef}
              type="search"
              value={cityTerm}
              onChange={(event) => setCityTerm(event.target.value)}
              placeholder="Pretraži gradove"
              className="h-12 w-full rounded-md border border-input bg-card pr-3.5 pl-11 text-base outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100"
            />
          </div>

          <ul className="m-0 flex list-none flex-col p-0">
            {searchCities(cityTerm).map((city) => (
              <li key={city.name}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft((prev) => ({
                      ...prev,
                      city: city.name,
                      lat: city.lat,
                      lng: city.lng,
                    }))
                    setLayer('main')
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-1 py-3.5 text-left text-base text-card-foreground hover:bg-muted',
                    draft.city === city.name && 'font-semibold text-brand-700'
                  )}
                >
                  <MapPinIcon className="size-[18px] text-zinc-400" aria-hidden />
                  {city.name}
                </button>
              </li>
            ))}
          </ul>
        </LayerScreen>
      ) : null}

      {layer === 'dates' ? (
        <LayerScreen
          title="Kada?"
          onBack={() => setLayer('main')}
          footer={
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, from: null, to: null }))}
                className="cursor-pointer border-none bg-transparent p-2 text-sm font-semibold text-zinc-700 underline"
              >
                Obriši datume
              </button>
              <Button size="lg" onClick={() => setLayer('main')} className="min-w-[140px]">
                Potvrdi
              </Button>
            </div>
          }
        >
          <DateRangeCalendar
            from={draft.from}
            to={draft.to}
            onChange={(from, to) => setDraft((prev) => ({ ...prev, from, to }))}
          />
        </LayerScreen>
      ) : null}
    </div>,
    document.body
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-2">
      <h2 className="mb-2 text-sm font-semibold text-card-foreground">{label}</h2>
      {children}
    </section>
  )
}

function SelectorButton({
  icon,
  value,
  placeholder,
  onClick,
}: {
  icon: React.ReactNode
  value: string | null
  placeholder: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-md border border-input bg-card px-3.5 text-left text-base text-card-foreground"
    >
      {icon}
      <span className={cn(!value && 'text-muted-foreground')}>{value ?? placeholder}</span>
    </button>
  )
}

/** Second-level full-screen layer for city and date pickers (doc 03 §5.3). */
function LayerScreen({
  title,
  onBack,
  footer,
  children,
}: {
  title: string
  onBack: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col bg-card">
      <header className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Nazad"
          className="grid size-10 cursor-pointer place-items-center rounded-full border-none bg-transparent text-zinc-700 hover:bg-muted"
        >
          <ChevronLeftIcon className="size-5" aria-hidden />
        </button>
        <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

      {footer ? (
        <footer className="border-t border-border px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {footer}
        </footer>
      ) : null}
    </div>
  )
}
