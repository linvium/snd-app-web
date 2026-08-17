import Supercluster from 'supercluster'

import type { MapPin } from '@/types/search'

export const MAP_MIN_ZOOM = 6
export const MAP_MAX_ZOOM = 17

/**
 * Three clustering regimes, by zoom (doc 03 §9.2).
 *
 * The break at 15 is the point where a pin stops describing a neighbourhood
 * and starts describing a building — which is also why the map refuses to zoom
 * past 17 at all.
 */
export type ClusterMode = 'city' | 'proximity' | 'none'

export function clusterModeForZoom(zoom: number): ClusterMode {
  if (zoom <= 11) return 'city'
  if (zoom <= 14) return 'proximity'
  return 'none'
}

export interface MapCluster {
  id: string
  lat: number
  lng: number
  count: number
  /** Set for city clusters, which show a name alongside the number. */
  label: string | null
  /** Populated only when a cluster is small enough to expand into a list. */
  pins: MapPin[]
  /** True when every member sits on the same point — zooming would not separate them. */
  isSinglePoint: boolean
}

export interface MapMarker {
  kind: 'pin'
  pin: MapPin
}

export type MapEntry = MapMarker | ({ kind: 'cluster' } & MapCluster)

/** Circle diameter in px (doc 03 §9.2). */
export function clusterSize(count: number): number {
  if (count >= 50) return 48
  if (count >= 10) return 40
  return 32
}

const SAME_POINT_EPSILON = 1e-6

function allOnSamePoint(pins: MapPin[]): boolean {
  if (pins.length < 2) return true
  const [first] = pins
  return pins.every(
    (pin) =>
      Math.abs(pin.approx_latitude - first.approx_latitude) < SAME_POINT_EPSILON &&
      Math.abs(pin.approx_longitude - first.approx_longitude) < SAME_POINT_EPSILON
  )
}

function centroid(pins: MapPin[]): { lat: number; lng: number } {
  const sum = pins.reduce(
    (acc, pin) => ({
      lat: acc.lat + pin.approx_latitude,
      lng: acc.lng + pin.approx_longitude,
    }),
    { lat: 0, lng: 0 }
  )
  return { lat: sum.lat / pins.length, lng: sum.lng / pins.length }
}

/** Zoomed out, a cluster is a city and says so by name (doc 03 §9.2). */
export function clusterByCity(pins: MapPin[]): MapEntry[] {
  const groups = new Map<string, MapPin[]>()

  for (const pin of pins) {
    const key = pin.city ?? 'Ostalo'
    const group = groups.get(key)
    if (group) {
      group.push(pin)
    } else {
      groups.set(key, [pin])
    }
  }

  return Array.from(groups.entries()).map(([city, group]) => {
    const center = centroid(group)
    return {
      kind: 'cluster' as const,
      id: `city:${city}`,
      lat: center.lat,
      lng: center.lng,
      count: group.length,
      label: city,
      pins: group,
      isSinglePoint: allOnSamePoint(group),
    }
  })
}

/**
 * Mid zoom groups by screen distance instead of by name, so two listings on
 * either side of a city border still read as one dot when they are 40 px
 * apart (doc 03 §9.2, radius 60 px).
 */
export function clusterByProximity(pins: MapPin[], zoom: number): MapEntry[] {
  const index = new Supercluster<{ pin: MapPin }>({
    radius: 60,
    minZoom: 12,
    maxZoom: 14,
  })

  index.load(
    pins.map((pin) => ({
      type: 'Feature' as const,
      properties: { pin },
      geometry: {
        type: 'Point' as const,
        coordinates: [pin.approx_longitude, pin.approx_latitude],
      },
    }))
  )

  const clusters = index.getClusters([-180, -85, 180, 85], Math.round(zoom))

  return clusters.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates
    // Supercluster returns leaves and clusters in one array, distinguished only
    // by the `cluster` flag on the properties.
    const properties = feature.properties as Partial<Supercluster.ClusterProperties> & {
      pin?: MapPin
    }

    if (!properties.cluster || !properties.cluster_id) {
      return { kind: 'pin' as const, pin: properties.pin as MapPin }
    }

    const clusterId = properties.cluster_id
    const count = properties.point_count ?? 0
    // Leaves are only needed to answer "is this all one address?", so the
    // request is capped rather than pulling thousands of members.
    const leaves = index
      .getLeaves(clusterId, Math.min(count, 50))
      .map((leaf) => (leaf.properties as { pin: MapPin }).pin)

    return {
      kind: 'cluster' as const,
      id: `cluster:${clusterId}`,
      lat,
      lng,
      count,
      label: null,
      pins: leaves,
      isSinglePoint: count === leaves.length && allOnSamePoint(leaves),
    }
  })
}

export function buildMapEntries(pins: MapPin[], zoom: number): MapEntry[] {
  const mode = clusterModeForZoom(zoom)

  if (mode === 'city') return clusterByCity(pins)
  if (mode === 'proximity') return clusterByProximity(pins, zoom)
  return pins.map((pin) => ({ kind: 'pin' as const, pin }))
}

export interface LatLngBounds {
  north: number
  south: number
  east: number
  west: number
}

/** Bounds covering the given pins, or null when there is nothing to frame. */
export function boundsOf(pins: Array<{ approx_latitude: number; approx_longitude: number }>) {
  if (pins.length === 0) return null

  return pins.reduce<LatLngBounds>(
    (acc, pin) => ({
      north: Math.max(acc.north, pin.approx_latitude),
      south: Math.min(acc.south, pin.approx_latitude),
      east: Math.max(acc.east, pin.approx_longitude),
      west: Math.min(acc.west, pin.approx_longitude),
    }),
    {
      north: pins[0].approx_latitude,
      south: pins[0].approx_latitude,
      east: pins[0].approx_longitude,
      west: pins[0].approx_longitude,
    }
  )
}
