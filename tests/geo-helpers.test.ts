import { describe, expect, it } from 'vitest'

import { mapNominatimHit, NOMINATIM_ACCEPT_LANGUAGE } from '@/lib/geo/geocode.helpers'
import { toSerbianLatin, toSerbianLatinOrNull } from '@/lib/geo/script.helpers'

describe('toSerbianLatin', () => {
  it('transliterates Serbian Cyrillic city and street names', () => {
    expect(toSerbianLatin('Београд')).toBe('Beograd')
    expect(toSerbianLatin('Нови Сад')).toBe('Novi Sad')
    expect(toSerbianLatin('Кнез Михаилова 1')).toBe('Knez Mihailova 1')
    expect(toSerbianLatin('Његошева 40')).toBe('Njegoševa 40')
    expect(toSerbianLatin('Џексона')).toBe('Džeksona')
  })

  it('uses full-caps digraphs in all-caps words', () => {
    expect(toSerbianLatin('ЊЕГОШЕВА')).toBe('NJEGOŠEVA')
    expect(toSerbianLatin('ЉУБЉАНА')).toBe('LJUBLJANA')
  })

  it('leaves latinica and punctuation alone', () => {
    expect(toSerbianLatin('Beograd')).toBe('Beograd')
    expect(toSerbianLatin('Knez Mihailova 1, Stari grad')).toBe('Knez Mihailova 1, Stari grad')
  })

  it('returns null for missing values', () => {
    expect(toSerbianLatinOrNull(null)).toBeNull()
    expect(toSerbianLatinOrNull(undefined)).toBeNull()
  })
})

describe('mapNominatimHit', () => {
  it('asks Nominatim for latinica, not the default sr Cyrillic', () => {
    expect(NOMINATIM_ACCEPT_LANGUAGE).toBe('sr-Latn,en')
  })

  it('converts a Cyrillic Nominatim hit before the UI sees it', () => {
    expect(
      mapNominatimHit({
        display_name: 'Кнез Михаилова 1, Стари град, Београд, Србија',
        lat: '44.8176',
        lon: '20.4633',
        address: {
          pedestrian: 'Кнез Михаилова',
          house_number: '1',
          city: 'Београд',
          postcode: '11000',
        },
      })
    ).toEqual({
      label: 'Knez Mihailova 1, Stari grad, Beograd, Srbija',
      street: 'Knez Mihailova 1',
      city: 'Beograd',
      postal_code: '11000',
      latitude: 44.8176,
      longitude: 20.4633,
    })
  })
})
