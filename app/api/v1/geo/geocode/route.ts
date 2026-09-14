import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiList, ERROR_CODES } from '@/lib/api/response'
import { mapNominatimHit, NOMINATIM_ACCEPT_LANGUAGE, type NominatimHit } from '@/lib/geo'

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
  url.searchParams.set('accept-language', NOMINATIM_ACCEPT_LANGUAGE)

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': NOMINATIM_ACCEPT_LANGUAGE,
      'User-Agent': 'SND-StvarNaDan/1.0 (listings geocode)',
    },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    console.error('[geo] nominatim failed', response.status)
    return apiError(502, ERROR_CODES.INTERNAL, 'Pretraga adrese trenutno nije dostupna.')
  }

  const hits = (await response.json()) as NominatimHit[]
  const results = hits.map(mapNominatimHit)

  return apiList(results, { total: results.length })
}
