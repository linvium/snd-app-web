import type { GeocodeResult } from '@/types/listing'

import { toSerbianLatin } from './script.helpers'

/** Matches `html lang="sr-Latn-RS"`. Bare `sr` is Cyrillic in Nominatim. */
export const NOMINATIM_ACCEPT_LANGUAGE = 'sr-Latn,en'

export interface NominatimAddress {
  road?: string
  pedestrian?: string
  house_number?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  postcode?: string
}

export interface NominatimHit {
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
}

export function mapNominatimHit(hit: NominatimHit): GeocodeResult {
  const address = hit.address ?? {}
  const road = address.road ?? address.pedestrian ?? ''
  const street = [road, address.house_number].filter(Boolean).join(' ')
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? ''

  return {
    label: toSerbianLatin(hit.display_name),
    street: toSerbianLatin(street || (hit.display_name.split(',')[0] ?? '')),
    city: toSerbianLatin(city),
    postal_code: address.postcode ?? null,
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
  }
}
