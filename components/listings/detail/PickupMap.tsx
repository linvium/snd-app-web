'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { PickupLocation as PickupLocationData } from '@/types/listing-detail'

/** Doc 04 §9: a 400 m circle, never a pin on the door. */
const CIRCLE_RADIUS_M = 400

/** Deep enough to place a neighbourhood, not deep enough to read house numbers. */
const MAX_ZOOM = 16

/**
 * The map alone (doc 04 §9), split out so it can be loaded browser-only —
 * Leaflet reads `window` when its module is evaluated, which would knock the
 * whole page off server rendering.
 *
 * Before payment this draws a circle around the blurred coordinates and no pin,
 * and the zoom stops short of the level where a single building is
 * identifiable: a map that resolves to a house has published an address
 * regardless of what the API returned.
 *
 * The exact fields are simply absent from the props for anyone not entitled to
 * them — the public view never selects them — so this component cannot leak
 * what it was never given.
 */
export default function PickupMap({
  locations,
  canSeeExact,
  label,
}: {
  locations: PickupLocationData[]
  canSeeExact: boolean
  label: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current || locations.length === 0) return

    const points = locations.map((location) => {
      const hasExact = canSeeExact && location.latitude != null && location.longitude != null
      return {
        lat: hasExact ? location.latitude! : location.approx_latitude,
        lng: hasExact ? location.longitude! : location.approx_longitude,
        isExact: hasExact,
      }
    })

    const map = L.map(containerRef.current, {
      center: [points[0].lat, points[0].lng],
      zoom: 14,
      maxZoom: MAX_ZOOM,
      zoomControl: true,
      // A map that swallows the page scroll is a trap on the way past it.
      scrollWheelZoom: false,
      attributionControl: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: MAX_ZOOM,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    for (const point of points) {
      if (point.isExact) {
        L.marker([point.lat, point.lng]).addTo(map)
      } else {
        L.circle([point.lat, point.lng], {
          radius: CIRCLE_RADIUS_M,
          color: '#2e8b5f',
          weight: 2,
          fillColor: '#2e8b5f',
          fillOpacity: 0.15,
        }).addTo(map)
      }
    }

    if (points.length > 1) {
      map.fitBounds(
        L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number])).pad(0.35),
        { maxZoom: MAX_ZOOM }
      )
    }

    mapRef.current = map

    // Leaflet caches its container size; without this it paints grey gaps when
    // the column is resized or the card starts out hidden.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [locations, canSeeExact])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={
        canSeeExact
          ? `Mapa sa tačnom lokacijom preuzimanja: ${label}`
          : `Mapa sa približnom zonom preuzimanja: ${label}`
      }
      // `isolate` is load-bearing: Leaflet stacks its own panes at z-index 400
      // and its controls higher still. Without a stacking context of its own
      // those compete at the root, and the map paints straight through anything
      // laid over the page - the gallery overlay included.
      className="isolate h-64 w-full overflow-hidden rounded-xl border border-border md:h-72"
    />
  )
}
