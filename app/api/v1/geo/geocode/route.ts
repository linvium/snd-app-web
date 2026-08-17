import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import type { GeocodeResult } from '@/types/listing'

interface NominatimAddress {
  road?: string
  pedestrian?: string
  house_number?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  postcode?: string
}

interface NominatimHit {
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
}

export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (query.length < 3) {
    return apiList([], { total: 0 })
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('countrycodes', 'rs')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SND-StvarNaDan/1.0 (listings geocode)',
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    console.error('[geo] nominatim failed', response.status)
    return apiError(502, ERROR_CODES.INTERNAL, 'Pretraga adrese trenutno nije dostupna.')
  }

  const hits = (await response.json()) as NominatimHit[]
  const results: GeocodeResult[] = hits.map((hit) => {
    const address = hit.address ?? {}
    const road = address.road ?? address.pedestrian ?? ''
    const street = [road, address.house_number].filter(Boolean).join(' ')
    return {
      label: hit.display_name,
      street: street || (hit.display_name.split(',')[0] ?? ''),
      city: address.city ?? address.town ?? address.village ?? address.municipality ?? '',
      postal_code: address.postcode ?? null,
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
    }
  })

  return apiList(results, { total: results.length })
}
