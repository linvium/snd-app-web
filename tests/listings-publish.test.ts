import { describe, expect, it } from 'vitest'

import { nextSlugCandidate, slugifyTitle } from '@/lib/listings/listings.slug'
import {
  isAllCapsTitle,
  itemValueWarning,
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

  it('accepts a missing item value', () => {
    const { fields, steps } = validateListingForm(valid({ itemValueRsd: null }))
    expect(fields.itemValue).toBeUndefined()
    expect(steps.some((step) => step.step === 'value')).toBe(false)
  })

  it('rejects an item value below the minimum when provided', () => {
    const { fields } = validateListingForm(valid({ itemValueRsd: 50 }))
    expect(fields.itemValue).toContain('1.000')
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

describe('itemValueWarning', () => {
  it('warns when value is low versus the daily price', () => {
    expect(itemValueWarning(1000, 200, 80000)).toContain('niska')
  })

  it('does not show the high-value similar-items warning', () => {
    expect(itemValueWarning(500_000, 800, 80000)).toBeUndefined()
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

  it('does not persist source dimensions on the listing image row or API payload', async () => {
    const { listingImageCreatedPayload, listingImageInsertRow } = await import(
      '@/lib/listings/listings.images'
    )
    const row = listingImageInsertRow({
      id: 'img-1',
      listingId: 'listing-1',
      thumbnailUrl: 'https://example.com/t.webp',
      mediumUrl: 'https://example.com/m.webp',
      largeUrl: 'https://example.com/l.webp',
      sortOrder: 0,
    })
    const payload = listingImageCreatedPayload(
      { id: row.id, thumbnail_url: row.thumbnail_url, sort_order: row.sort_order },
      false
    )

    expect(row).toEqual({
      id: 'img-1',
      listing_id: 'listing-1',
      url: 'https://example.com/l.webp',
      thumbnail_url: 'https://example.com/t.webp',
      medium_url: 'https://example.com/m.webp',
      large_url: 'https://example.com/l.webp',
      sort_order: 0,
    })
    expect(row).not.toHaveProperty('width')
    expect(row).not.toHaveProperty('height')
    expect(payload).not.toHaveProperty('width')
    expect(payload).not.toHaveProperty('height')
  })

  it('crops a square original to 4:3 variants', async () => {
    const sharp = (await import('sharp')).default
    const { processListingImage } = await import('@/lib/listings/listings.images')
    const buffer = await sharp({
      create: { width: 300, height: 300, channels: 3, background: '#336699' },
    })
      .jpeg()
      .toBuffer()

    const result = await processListingImage(buffer)
    const thumb = await sharp(result.variants.thumbnail.jpeg).metadata()
    const medium = await sharp(result.variants.medium.jpeg).metadata()

    expect(result.width).toBe(300)
    expect(result.height).toBe(300)
    expect(thumb.width).toBe(400)
    expect(thumb.height).toBe(300)
    expect(medium.width).toBe(800)
    expect(medium.height).toBe(600)
  })

  it('caps the large variant at 1200px width and keeps a smaller thumb', async () => {
    const sharp = (await import('sharp')).default
    const { processListingImage } = await import('@/lib/listings/listings.images')
    const buffer = await sharp({
      create: { width: 2400, height: 1800, channels: 3, background: '#114477' },
    })
      .jpeg()
      .toBuffer()

    const result = await processListingImage(buffer)
    const large = await sharp(result.variants.large.jpeg).metadata()
    const thumb = await sharp(result.variants.thumbnail.jpeg).metadata()
    expect(large.width).toBeLessThanOrEqual(1200)
    expect(thumb.width).toBeLessThanOrEqual(400)
    expect(result.variants.thumbnail.jpeg.byteLength).toBeLessThan(result.variants.large.jpeg.byteLength)
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
