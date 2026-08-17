'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CrosshairIcon, MinusIcon, PlusIcon, SearchIcon } from 'lucide-react'

import {
  boundsOf,
  buildMapEntries,
  clusterModeForZoom,
  clusterSize,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  type MapEntry,
} from '@/lib/search/map.clustering'
import { boundsCenter, boundsToRadiusKm, formatPriceMinor, type Coordinates } from '@/lib/search'
import { MAX_MAP_PINS, type MapPin } from '@/types/search'

interface SearchMapProps {
  pins: MapPin[]
  truncated: boolean
  center: Coordinates | null
  userCoords: Coordinates | null
  /** Listing id hovered in the result list — its pin grows and changes colour. */
  highlightedId: string | null
  onPinHover: (listingId: string | null) => void
  /** `point` is the pin's position inside the map container, so the desktop
   *  bubble can sit directly above it (doc 03 §9.3). */
  onPinSelect: (pin: MapPin, point: { x: number; y: number }) => void
  onSearchThisArea: (center: Coordinates, radiusKm: number) => void
}

const VISITED_KEY = 'snd:visited-listings'

function loadVisited(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(VISITED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

/**
 * The results map (doc 03 §9).
 *
 * Two rules drive the design. Pins sit on the blurred coordinates and the zoom
 * stops at 17, because a map that resolves to a house has published an address.
 * And panning never re-runs the search on its own — it offers a button, since
 * refetching on every drag is both irritating and expensive (§9.3).
 */
export default function SearchMap({
  pins,
  truncated,
  center,
  userCoords,
  highlightedId,
  onPinHover,
  onPinSelect,
  onSearchThisArea,
}: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const didFitRef = useRef(false)

  const [zoom, setZoom] = useState(12)
  const [hasMoved, setHasMoved] = useState(false)
  const [visited, setVisited] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setVisited(loadVisited())
  }, [])

  // Callbacks are read through a ref so re-renders of the parent do not tear
  // down and rebuild every marker's listeners.
  const handlers = useRef({ onPinHover, onPinSelect })
  useEffect(() => {
    handlers.current = { onPinHover, onPinSelect }
  }, [onPinHover, onPinSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [center?.lat ?? 44.0165, center?.lng ?? 21.0059],
      zoom: 12,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: MAP_MAX_ZOOM,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    setZoom(map.getZoom())

    map.on('zoomend', () => setZoom(map.getZoom()))

    // The re-search button answers a deliberate move, so it listens for the
    // gestures a person makes — not for `moveend`, which also fires on
    // fitBounds, setView and invalidateSize.
    map.on('dragend', () => setHasMoved(true))
    const container = containerRef.current
    container.addEventListener('wheel', () => setHasMoved(true), { passive: true })
    container.addEventListener('dblclick', () => setHasMoved(true))

    // The container changes size when the list/map toggle flips or the phone
    // overlay opens. Leaflet caches its dimensions, so without this it paints
    // tiles for the old size and leaves grey gaps.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // Deliberately mounts once — later centre changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initial frame: every result on the first page, with 40 px of breathing
  // room (doc 03 §9.1).
  useEffect(() => {
    const map = mapRef.current
    if (!map || didFitRef.current || pins.length === 0) return

    const bounds = boundsOf(pins)
    if (!bounds) return

    didFitRef.current = true
    map.fitBounds(
      L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]),
      { padding: [40, 40], maxZoom: MAP_MAX_ZOOM }
    )
    setHasMoved(false)
  }, [pins])

  // A new search centre re-frames the map and clears the pending-move state.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !center) return
    didFitRef.current = false
    map.setView([center.lat, center.lng], map.getZoom())
    setHasMoved(false)
  }, [center?.lat, center?.lng])

  const entries = useMemo<MapEntry[]>(() => {
    // Past the cap only clusters are drawn, so a pin can never be read as
    // "this listing is exactly here" in a crowd (doc 03 §9.4).
    if (truncated && clusterModeForZoom(zoom) === 'none') {
      return buildMapEntries(pins, 14)
    }
    return buildMapEntries(pins, zoom)
  }, [pins, zoom, truncated])

  const markVisited = useCallback((listingId: string) => {
    setVisited((previous) => {
      const next = new Set(previous).add(listingId)
      try {
        window.sessionStorage.setItem(VISITED_KEY, JSON.stringify([...next]))
      } catch {
        // A full or blocked sessionStorage only costs the grey "seen" state.
      }
      return next
    })
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    for (const entry of entries) {
      if (entry.kind === 'cluster') {
        const size = clusterSize(entry.count)
        const marker = L.marker([entry.lat, entry.lng], {
          icon: L.divIcon({
            className: 'snd-marker',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            html: `<button type="button" aria-label="${entry.label ? `${entry.label}, ` : ''}${entry.count} predmeta" style="width:${size}px;height:${size}px" class="grid cursor-pointer place-items-center rounded-full border-2 border-white bg-brand-500 text-xs font-bold text-white shadow-md">${entry.count}</button>`,
          }),
          keyboard: true,
        })

        marker.on('click', () => {
          // Zooming cannot separate members that share an address, so the
          // cluster opens as a list instead (doc 03 §9.2).
          if (entry.isSinglePoint && entry.pins.length > 0) {
            handlers.current.onPinSelect(entry.pins[0], map.latLngToContainerPoint([entry.lat, entry.lng]))
            return
          }
          const bounds = boundsOf(entry.pins)
          if (bounds) {
            map.fitBounds(
              L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]),
              { padding: [40, 40], maxZoom: MAP_MAX_ZOOM }
            )
          } else {
            map.setView([entry.lat, entry.lng], Math.min(map.getZoom() + 3, MAP_MAX_ZOOM))
          }
        })

        if (entry.label) {
          marker.bindTooltip(`${entry.label} · ${entry.count}`, { direction: 'top' })
        }

        marker.addTo(layer)
        continue
      }

      const { pin } = entry
      const isActive = highlightedId === pin.id
      const isVisited = visited.has(pin.id)

      const marker = L.marker([pin.approx_latitude, pin.approx_longitude], {
        icon: L.divIcon({
          className: 'snd-marker',
          iconSize: [80, 28],
          iconAnchor: [40, 28],
          html: `<button type="button" aria-label="${pin.title}, ${formatPriceMinor(pin.price_1_day_minor)} po danu" class="${[
            'cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm transition-transform',
            isActive
              ? 'scale-115 border-brand-600 bg-brand-500 text-white'
              : isVisited
                ? 'border-zinc-300 bg-zinc-100 text-zinc-500'
                : 'border-border bg-white text-zinc-800',
          ].join(' ')}">${formatPriceMinor(pin.price_1_day_minor)}</button>`,
        }),
        keyboard: true,
        riseOnHover: true,
      })

      marker.on('click', () => {
        markVisited(pin.id)
        handlers.current.onPinSelect(
          pin,
          map.latLngToContainerPoint([pin.approx_latitude, pin.approx_longitude])
        )
      })
      // Hovering a pin outlines its card and scrolls it into view (§8).
      marker.on('mouseover', () => handlers.current.onPinHover(pin.id))
      marker.on('mouseout', () => handlers.current.onPinHover(null))
      marker.on('keypress', (event) => {
        if ((event as unknown as { originalEvent: KeyboardEvent }).originalEvent.key === 'Enter') {
          markVisited(pin.id)
          handlers.current.onPinSelect(
            pin,
            map.latLngToContainerPoint([pin.approx_latitude, pin.approx_longitude])
          )
        }
      })

      marker.addTo(layer)
    }
  }, [entries, highlightedId, visited, markVisited])

  const handleSearchThisArea = () => {
    const map = mapRef.current
    if (!map) return

    const bounds = map.getBounds()
    const box = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    }

    onSearchThisArea(boundsCenter(box), boundsToRadiusKm(box))
    setHasMoved(false)
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Mapa rezultata" />

      {/* Never automatic: panning offers, the user decides (doc 03 §9.3). */}
      {hasMoved ? (
        <button
          type="button"
          onClick={handleSearchThisArea}
          className="absolute top-3 left-1/2 z-[400] inline-flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-semibold text-card-foreground shadow-md hover:bg-muted"
        >
          <SearchIcon className="size-4" aria-hidden />
          Pretraži u ovoj oblasti
        </button>
      ) : null}

      {truncated ? (
        <p className="absolute right-3 bottom-8 left-3 z-[400] rounded-md bg-card/95 px-3 py-2 text-center text-[12px] text-zinc-600 shadow-sm">
          Suzi pretragu da bi video pojedinačne predmete ({MAX_MAP_PINS}+ rezultata)
        </p>
      ) : null}

      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        <MapControl
          label="Uvećaj"
          onClick={() => {
            mapRef.current?.zoomIn()
            setHasMoved(true)
          }}
          icon={<PlusIcon className="size-4" aria-hidden />}
        />
        <MapControl
          label="Umanji"
          onClick={() => {
            mapRef.current?.zoomOut()
            setHasMoved(true)
          }}
          icon={<MinusIcon className="size-4" aria-hidden />}
        />
        {userCoords ? (
          <MapControl
            label="Vrati se na moju lokaciju"
            onClick={() => mapRef.current?.setView([userCoords.lat, userCoords.lng], 13)}
            icon={<CrosshairIcon className="size-4" aria-hidden />}
          />
        ) : null}
      </div>
    </div>
  )
}

function MapControl({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 cursor-pointer place-items-center rounded-md border border-border bg-card text-zinc-700 shadow-sm hover:bg-muted"
    >
      {icon}
    </button>
  )
}
