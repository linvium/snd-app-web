import { describe, expect, it } from 'vitest'

import { nextSlugCandidate, slugifyTitle } from '@/lib/listings/listings.slug'
import {
  isAllCapsTitle,
  publishFieldErrors,
  rsdToMinor,
  savingsForPackage,
  validateListingForm,
  validatePrices,
  type ListingFormValues,
} from '@/lib/listings/listings.validation'

const valid = (overrides: Partial<ListingFormValues> = {}): ListingFormValues => ({
  title: 'Bušilica Bosch GSB 13 RE',
  description: 'Bušilica sa dva nastavka i koferom. Malo korišćena, sve radi kako treba.',
  categoryId: 'cat-1',
  categoryIsLeaf: true,
  categoryEnabled: true,
  imageCount: 1,
  price1DayRsd: 800,
  price3DaysRsd: 2100,
  price7DaysRsd: 4200,
  locationIds: ['loc-1'],
  cancellationPolicy: 'flexible',
  itemValueRsd: 25000,
  ...overrides,
})

describe('slugifyTitle', () => {
  it('transliterates Serbian diacritics and dashes the rest', () => {
    expect(slugifyTitle('Bušilica Bosch GSB 13 RE')).toBe('busilica-bosch-gsb-13-re')
    expect(slugifyTitle('Đak čuva ženu')).toBe('djak-cuva-zenu')
  })

  it('cuts at a word boundary under 80 characters', () => {
    const long = 'vrlo-dugacak-naslov-predmeta-koji-prelazi-ogranicenje-od-osamdeset-karaktera-i-jos-nesto'
    const slug = slugifyTitle(long.replace(/-/g, ' '))
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('adds numeric suffixes for collisions', () => {
    expect(nextSlugCandidate('busilica', 1)).toBe('busilica')
    expect(nextSlugCandidate('busilica', 2)).toBe('busilica-2')
    expect(nextSlugCandidate('busilica', 3)).toBe('busilica-3')
  })
})

describe('validatePrices', () => {
  it('requires a 1-day price', () => {
    expect(validatePrices({ price1DayRsd: null, price3DaysRsd: null, price7DaysRsd: null }).price1).toBe(
      'Unesi cenu za 1 dan.'
    )
  })

  it('rejects a 3-day package that is not cheaper than three daily rates', () => {
    const errors = validatePrices({ price1DayRsd: 800, price3DaysRsd: 2500, price7DaysRsd: null })
    expect(errors.price3).toContain('manje od 2.400 RSD')
  })

  it('accepts a cheaper 3-day package', () => {
    const errors = validatePrices({ price1DayRsd: 800, price3DaysRsd: 2100, price7DaysRsd: 4200 })
    expect(errors.price3).toBeUndefined()
    expect(errors.price7).toBeUndefined()
  })
})

describe('validateListingForm', () => {
  it('passes a complete listing', () => {
    const { fields, steps } = validateListingForm(valid())
    expect(fields).toEqual({})
    expect(steps).toEqual([])
  })

  it('maps missing photos and locations to publish field errors', () => {
    const fields = publishFieldErrors(valid({ imageCount: 0, locationIds: [] }))
    expect(fields.images).toBe('Dodaj bar jednu sliku.')
    expect(fields.locations).toBe('Izaberi mesto predaje.')
  })

  it('treats all-caps titles as a warning, not a blocking error', () => {
    expect(isAllCapsTitle('BUSILICA BOSCH GSB')).toBe(true)
    const { fields } = validateListingForm(valid({ title: 'BUSILICA BOSCH GSB' }))
    expect(fields.title).toBeUndefined()
  })
})

describe('money helpers', () => {
  it('stores dinars as para', () => {
    expect(rsdToMinor(800)).toBe(80000)
  })

  it('computes package savings', () => {
    const savings = savingsForPackage(800, 2100, 3)
    expect(savings?.perDayRsd).toBe(700)
    expect(savings?.percent).toBe(12)
  })
})

describe('processListingImage', () => {
  it('upscales a small jpeg instead of rejecting it', async () => {
    const sharp = (await import('sharp')).default
    const { processListingImage } = await import('@/lib/listings/listings.images')
    const buffer = await sharp({
      create: { width: 200, height: 150, channels: 3, background: '#336699' },
    })
      .jpeg()
      .toBuffer()

    const result = await processListingImage(buffer)
    expect(result.width).toBe(200)
    expect(result.height).toBe(150)
    expect(result.variants.thumbnail.webp.byteLength).toBeGreaterThan(0)
    expect(result.variants.large.jpeg.byteLength).toBeGreaterThan(0)
  })

  it('rejects non-image bytes', async () => {
    const { processListingImage, ImageProcessingError } = await import(
      '@/lib/listings/listings.images'
    )
    await expect(processListingImage(Buffer.from('not-an-image'))).rejects.toBeInstanceOf(
      ImageProcessingError
    )
  })
})
