import { describe, expect, it } from 'vitest'

import { maskContactDetails, prepareDescription } from '@/lib/listings/listings.description'

describe('maskContactDetails', () => {
  // doc 04 §16, "Kontakt podaci u opisu".
  it('masks a local mobile number', () => {
    const result = maskContactDetails('Zovi me na 0641234567')
    expect(result.text).toBe('Zovi me na •••')
    expect(result.hasMaskedContact).toBe(true)
  })

  it.each([
    ['+381641234567'],
    ['+381 64 123 4567'],
    ['064/123-4567'],
    ['064 123 45 67'],
    ['00381641234567'],
  ])('masks %s', (phone) => {
    expect(maskContactDetails(`Broj: ${phone}`).text).toBe('Broj: •••')
  })

  it('masks email addresses', () => {
    const result = maskContactDetails('Piši na marko.petrovic@gmail.com za dogovor')
    expect(result.text).toBe('Piši na ••• za dogovor')
  })

  it('masks digits spaced out to dodge the filter', () => {
    expect(maskContactDetails('0 6 4 1 2 3 4 5 6 7').text).toBe('•••')
  })

  it('leaves prices, years and model numbers alone', () => {
    // The whole risk in a pattern like this is over-matching: a masked price is
    // a broken listing, and it fails silently because it still looks plausible.
    const text =
      'Bušilica Bosch GSB 13 RE iz 2019, vrednost 25000 RSD, 750 W, 13 mm stezna glava.'
    const result = maskContactDetails(text)
    expect(result.text).toBe(text)
    expect(result.hasMaskedContact).toBe(false)
  })

  it('leaves a URL as inert text rather than masking or linking it', () => {
    // Doc 04 §6 says URLs are shown as plain text — not removed, not linkified.
    const text = 'Detalji na www.bosch.rs/gsb13re'
    expect(maskContactDetails(text).text).toBe(text)
  })

  it('reports nothing masked when there is nothing to mask', () => {
    expect(maskContactDetails('Obična bušilica, malo korišćena.').hasMaskedContact).toBe(false)
  })

  it('handles an empty description', () => {
    expect(maskContactDetails(null)).toEqual({ text: '', hasMaskedContact: false })
  })

  it('masks an email before the phone pattern can bite into it', () => {
    // "…@mail064123456.com" — the digit run inside the domain must not be
    // masked separately, leaving half an address behind.
    const result = maskContactDetails('kontakt064123456@primer.com')
    expect(result.text).toBe('•••')
  })
})

describe('prepareDescription', () => {
  it('leaves a short description whole', () => {
    const result = prepareDescription('Kratak opis predmeta koji staje u jedan red.')
    expect(result.isTruncated).toBe(false)
    expect(result.preview).toBe(result.text)
  })

  it('truncates past 400 characters at a word boundary (doc 04 §6)', () => {
    const long = 'reč '.repeat(200).trim()
    const result = prepareDescription(long)

    expect(result.isTruncated).toBe(true)
    expect(result.preview.length).toBeLessThanOrEqual(400)
    // Never mid-word: the collapsed state must not end on a fragment.
    expect(result.preview.endsWith('reč')).toBe(true)
    expect(result.text.length).toBeGreaterThan(result.preview.length)
  })

  it('keeps the full text available for the expanded state', () => {
    const long = `${'a'.repeat(500)} kraj`
    expect(prepareDescription(long).text).toContain('kraj')
  })

  it('masks before measuring, so the cut is made on what is shown', () => {
    const result = prepareDescription(`${'reč '.repeat(120)}0641234567`)
    expect(result.text).toContain('•••')
    expect(result.hasMaskedContact).toBe(true)
  })
})
