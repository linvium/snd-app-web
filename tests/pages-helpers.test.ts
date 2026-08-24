import { describe, expect, it } from 'vitest'

import {
  buildPageDocument,
  formatPageDate,
  headingId,
  pageMetaDescription,
} from '@/lib/pages/pages.helpers'
import { isPagesPath, pagePath, parsePagePath } from '@/lib/pages/pages.paths'
import type { SndPage } from '@/types/page'

function page(overrides: Partial<SndPage> = {}): SndPage {
  return {
    id: '1',
    slug: 'guarantee',
    category: 'support',
    title: 'Garancija',
    summary: 'Šta je pokriveno.',
    content: '<p>Uvod.</p>',
    published_at: '2026-08-21T10:00:00.000Z',
    ...overrides,
  }
}

describe('parsePagePath', () => {
  it('reads a page href back into its category and slug', () => {
    expect(parsePagePath('/support/guarantee')).toEqual({
      category: 'support',
      slug: 'guarantee',
    })
    expect(parsePagePath('/legal/privacy')).toEqual({
      category: 'legal',
      slug: 'privacy',
    })
  })

  it('ignores the hash and query, which only pick a spot on the same page', () => {
    expect(parsePagePath('/support/faq#otkazivanje')).toEqual({
      category: 'support',
      slug: 'faq',
    })
  })

  it('leaves everything that is not a page alone', () => {
    // Anything here that came back non-null would have the sheet swallow a
    // click meant for a real navigation.
    expect(parsePagePath('/search?q=busilica')).toBeNull()
    expect(parsePagePath('/listings/nikon-z6-iii')).toBeNull()
    expect(parsePagePath('/support')).toBeNull()
    expect(parsePagePath('/support/faq/extra')).toBeNull()
    expect(parsePagePath('https://snd.rs/support/faq')).toBeNull()
    expect(parsePagePath('mailto:podrska@snd.rs')).toBeNull()
    expect(parsePagePath('/support/Guarantee')).toBeNull()
  })
})

describe('pagePath', () => {
  it('is the address the row is served at', () => {
    expect(pagePath('support', 'faq')).toBe('/support/faq')
    expect(isPagesPath('/support/faq')).toBe(true)
    expect(isPagesPath('/legal')).toBe(true)
    expect(isPagesPath('/search')).toBe(false)
  })
})

describe('headingId', () => {
  it('folds Serbian diacritics so an anchor stays ascii', () => {
    expect(headingId('Šta je pokriveno?')).toBe('sta-je-pokriveno')
    expect(headingId('Kako se prijavljuje šteta')).toBe('kako-se-prijavljuje-steta')
    expect(headingId('Đubre, čađ i žito')).toBe('dubre-cad-i-zito')
  })

  it('always returns something linkable', () => {
    expect(headingId('???')).toBe('sekcija')
  })
})

describe('buildPageDocument', () => {
  it('anchors every h2 and lists them in order', () => {
    const doc = buildPageDocument(
      page({ content: '<h2>Šta je pokriveno</h2><p>a</p><h2>Do kog iznosa</h2>' })
    )

    expect(doc.toc).toEqual([
      { id: 'sta-je-pokriveno', label: 'Šta je pokriveno' },
      { id: 'do-kog-iznosa', label: 'Do kog iznosa' },
    ])
    expect(doc.html).toContain('<h2 id="sta-je-pokriveno">Šta je pokriveno</h2>')
    expect(doc.html).toContain('<h2 id="do-kog-iznosa">Do kog iznosa</h2>')
  })

  it('keeps duplicate headings apart', () => {
    const doc = buildPageDocument(page({ content: '<h2>Uslovi</h2><h2>Uslovi</h2>' }))
    expect(doc.toc.map((entry) => entry.id)).toEqual(['uslovi', 'uslovi-2'])
  })

  it('keeps other attributes on the heading and replaces a stale id', () => {
    const doc = buildPageDocument(page({ content: '<h2 class="x" id="old">Uslovi</h2>' }))
    expect(doc.html).toBe('<h2 class="x" id="uslovi">Uslovi</h2>')
  })

  it('leaves a body without headings untouched', () => {
    const doc = buildPageDocument(page())
    expect(doc.html).toBe('<p>Uvod.</p>')
    expect(doc.toc).toEqual([])
  })
})

describe('pageMetaDescription', () => {
  it('prefers the summary', () => {
    expect(pageMetaDescription(page())).toBe('Šta je pokriveno.')
  })

  it('falls back to the body with the tags stripped', () => {
    expect(
      pageMetaDescription({ summary: null, content: '<p>Prvi red.</p><p>Drugi red.</p>' })
    ).toBe('Prvi red. Drugi red.')
  })

  it('caps what search results would cut off anyway', () => {
    const long = { summary: 'a'.repeat(300), content: '' }
    expect(pageMetaDescription(long).length).toBeLessThanOrEqual(160)
    expect(pageMetaDescription(long).endsWith('…')).toBe(true)
  })
})

describe('formatPageDate', () => {
  it('renders the editorial date', () => {
    expect(formatPageDate('2026-08-21T10:00:00.000Z')).toContain('2026')
  })

  it('survives a broken value', () => {
    expect(formatPageDate('not-a-date')).toBe('')
  })
})
