import { describe, expect, it } from 'vitest'

import {
  HEADER_SEARCH_MAX_WIDTH_PX,
  HEADER_UTILITY_LINKS,
  headerIsFullWidth,
  headerShowsSearch,
} from '@/lib/layout/header.helpers'

describe('headerShowsSearch', () => {
  it('hides search in the header on the homepage', () => {
    expect(headerShowsSearch('/')).toBe(false)
  })

  it('shows search in the header on every other page', () => {
    expect(headerShowsSearch('/search')).toBe(true)
    expect(headerShowsSearch('/garancija')).toBe(true)
    expect(headerShowsSearch('/profile/listings')).toBe(true)
  })
})

describe('headerIsFullWidth', () => {
  it('spans the viewport on the homepage and search', () => {
    expect(headerIsFullWidth('/')).toBe(true)
    expect(headerIsFullWidth('/search')).toBe(true)
  })

  it('keeps a centered shell on other pages', () => {
    expect(headerIsFullWidth('/faq')).toBe(false)
    expect(headerIsFullWidth('/garancija')).toBe(false)
  })
})

describe('HEADER_SEARCH_MAX_WIDTH_PX', () => {
  it('caps the header search so it cannot fill the row', () => {
    expect(HEADER_SEARCH_MAX_WIDTH_PX).toBe(640)
  })
})

describe('HEADER_UTILITY_LINKS', () => {
  it('lists the tiny top-bar pages in order', () => {
    expect(HEADER_UTILITY_LINKS.map((link) => [link.href, link.label])).toEqual([
      ['/kako-funkcionise', 'Kako funkcioniše'],
      ['/garancija', 'Garancija'],
      ['/faq', 'Česta pitanja'],
      ['/contact', 'Kontakt'],
    ])
  })
})
