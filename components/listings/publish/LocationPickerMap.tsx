'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { Coordinates } from '@/lib/search/search.helpers'

const BELGRADE: Coordinates = { lat: 44.8176, lng: 20.4633 }

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export function LocationPickerMap({
  coordinates,
  onChange,
}: {
  coordinates: Coordinates | null
  onChange: (coords: Coordinates) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const start = coordinates ?? BELGRADE
    const map = L.map(containerRef.current, { zoomControl: true }).setView([start.lat, start.lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      onChange({ lat: pos.lat, lng: pos.lng })
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Mount once; later updates go through the second effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!coordinates || !mapRef.current || !markerRef.current) return
    markerRef.current.setLatLng([coordinates.lat, coordinates.lng])
    mapRef.current.setView([coordinates.lat, coordinates.lng], Math.max(mapRef.current.getZoom(), 15))
  }, [coordinates])

  return <div ref={containerRef} className="h-48 w-full overflow-hidden rounded-lg border border-border" />
}
