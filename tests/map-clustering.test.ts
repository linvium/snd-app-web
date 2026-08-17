import { describe, expect, it } from 'vitest'

import {
  boundsOf,
  buildMapEntries,
  clusterByCity,
  clusterModeForZoom,
  clusterSize,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from '@/lib/search/map.clustering'
import type { MapPin } from '@/types/search'

let counter = 0
function pin(lat: number, lng: number, city: string): MapPin {
  counter += 1
  return {
    id: `pin-${counter}`,
    slug: `oglas-${counter}`,
    title: `Oglas ${counter}`,
    price_1_day_minor: 80000,
    approx_latitude: lat,
    approx_longitude: lng,
    city,
  }
}

// Fifteen scattered around Belgrade and two around Novi Sad — the fixture from
// the doc 03 §9.5 acceptance criteria.
const belgrade = Array.from({ length: 15 }, (_, index) =>
  pin(44.8 + index * 0.004, 20.45 + index * 0.004, 'Beograd')
)
const noviSad = Array.from({ length: 2 }, (_, index) =>
  pin(45.26 + index * 0.004, 19.83 + index * 0.004, 'Novi Sad')
)

describe('clusterModeForZoom', () => {
  // doc 03 §9.2
  it('groups by city while zoomed out', () => {
    expect(clusterModeForZoom(6)).toBe('city')
    expect(clusterModeForZoom(11)).toBe('city')
  })

  it('groups by proximity in the middle band', () => {
    expect(clusterModeForZoom(12)).toBe('proximity')
    expect(clusterModeForZoom(14)).toBe('proximity')
  })

  it('stops clustering once individual pins are meaningful', () => {
    expect(clusterModeForZoom(15)).toBe('none')
    expect(clusterModeForZoom(MAP_MAX_ZOOM)).toBe('none')
  })
})

describe('clusterSize', () => {
  // doc 03 §9.2 — 1–9 → 32, 10–49 → 40, 50+ → 48.
  it('grows the circle with the count', () => {
    expect(clusterSize(1)).toBe(32)
    expect(clusterSize(9)).toBe(32)
    expect(clusterSize(10)).toBe(40)
    expect(clusterSize(49)).toBe(40)
    expect(clusterSize(50)).toBe(48)
    expect(clusterSize(500)).toBe(48)
  })
})

describe('clusterByCity', () => {
  it('shows one circle per city with its count', () => {
    const clusters = clusterByCity([...belgrade, ...noviSad])
    expect(clusters).toHaveLength(2)

    const counts = clusters
      .filter((entry) => entry.kind === 'cluster')
      .map((entry) => ({ label: entry.label, count: entry.count }))

    expect(counts).toContainEqual({ label: 'Beograd', count: 15 })
    expect(counts).toContainEqual({ label: 'Novi Sad', count: 2 })
  })

  it('places the circle at the centre of its members', () => {
    const [cluster] = clusterByCity(noviSad)
    if (cluster.kind !== 'cluster') throw new Error('expected a cluster')
    expect(cluster.lat).toBeCloseTo(45.262, 2)
  })

  it('flags a cluster whose members share one point, since zooming cannot split it', () => {
    const sameFlat = [pin(44.8, 20.45, 'Beograd'), pin(44.8, 20.45, 'Beograd')]
    const [cluster] = clusterByCity(sameFlat)
    if (cluster.kind !== 'cluster') throw new Error('expected a cluster')
    expect(cluster.isSinglePoint).toBe(true)
  })
})

describe('buildMapEntries', () => {
  it('draws two city circles at zoom 8', () => {
    const entries = buildMapEntries([...belgrade, ...noviSad], 8)
    expect(entries.every((entry) => entry.kind === 'cluster')).toBe(true)
    expect(entries).toHaveLength(2)
  })

  it('gives every listing its own pin at zoom 16', () => {
    const entries = buildMapEntries([...belgrade, ...noviSad], 16)
    expect(entries).toHaveLength(17)
    expect(entries.every((entry) => entry.kind === 'pin')).toBe(true)
  })

  it('splits the two cities apart in the proximity band', () => {
    const entries = buildMapEntries([...belgrade, ...noviSad], 13)
    // 75 km apart is far beyond 60 px at this zoom, so they never merge.
    expect(entries.length).toBeGreaterThanOrEqual(2)
    const total = entries.reduce(
      (sum, entry) => sum + (entry.kind === 'cluster' ? entry.count : 1),
      0
    )
    expect(total).toBe(17)
  })

  it('accounts for every pin at every zoom level', () => {
    for (let zoom = MAP_MIN_ZOOM; zoom <= MAP_MAX_ZOOM; zoom += 1) {
      const entries = buildMapEntries([...belgrade, ...noviSad], zoom)
      const total = entries.reduce(
        (sum, entry) => sum + (entry.kind === 'cluster' ? entry.count : 1),
        0
      )
      expect(total, `zoom ${zoom}`).toBe(17)
    }
  })
})

describe('boundsOf', () => {
  it('frames every pin', () => {
    const bounds = boundsOf([...belgrade, ...noviSad])
    expect(bounds).not.toBeNull()
    expect(bounds!.north).toBeCloseTo(45.264, 2)
    expect(bounds!.south).toBeCloseTo(44.8, 2)
    expect(bounds!.west).toBeCloseTo(19.83, 2)
    expect(bounds!.east).toBeCloseTo(20.506, 2)
  })

  it('returns nothing when there is nothing to frame', () => {
    expect(boundsOf([])).toBeNull()
  })
})
