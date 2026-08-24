import { describe, expect, it } from 'vitest'

import {
  FOOTER_COMPANY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_SOCIAL_LINKS,
  footerIsVisible,
} from '@/lib/layout/footer.helpers'
import { HEADER_UTILITY_LINKS } from '@/lib/layout/header.helpers'
import { parsePagePath } from '@/lib/pages/pages.paths'

describe('footerIsVisible', () => {
  it('stands under the public pages', () => {
    expect(footerIsVisible('/')).toBe(true)
    expect(footerIsVisible('/listings/nikon-z6-iii')).toBe(true)
    expect(footerIsVisible('/support/faq')).toBe(true)
  })

  it('stays out of the publish flow', () => {
    // A footer under a step form reads as the end of the form.
    expect(footerIsVisible('/profile/listings/new')).toBe(false)
    expect(footerIsVisible('/listings/new')).toBe(false)
  })

  it('stays off search, where the map owns the viewport', () => {
    expect(footerIsVisible('/search')).toBe(false)
    // The category listing is a normal document and keeps it.
    expect(footerIsVisible('/categories')).toBe(true)
  })
})

describe('FOOTER_COMPANY_LINKS', () => {
  it('is the header utility row, not a second copy of it', () => {
    expect(FOOTER_COMPANY_LINKS).toBe(HEADER_UTILITY_LINKS)
    expect(FOOTER_COMPANY_LINKS.map((link) => link.label)).toEqual([
      'Kako funkcioniše',
      'Garancija',
      'Česta pitanja',
      'Kontakt',
    ])
  })
})

describe('FOOTER_LEGAL_LINKS', () => {
  it('names the legal documents and the index they live in', () => {
    expect(FOOTER_LEGAL_LINKS.map((link) => link.href)).toEqual([
      '/legal/terms',
      '/legal/privacy',
      '/support/cancellation-policy',
      '/legal',
    ])
  })

  it('points every document at a page the sheet can open', () => {
    // Anything but the index has to parse as a page, or the click would leave
    // the current screen instead of opening over it.
    for (const link of FOOTER_LEGAL_LINKS.filter((entry) => entry.href !== '/legal')) {
      expect(parsePagePath(link.href)).not.toBeNull()
    }
    for (const link of FOOTER_COMPANY_LINKS) {
      expect(parsePagePath(link.href)).not.toBeNull()
    }
  })
})

describe('FOOTER_SOCIAL_LINKS', () => {
  it('leaves the site, over https', () => {
    expect(FOOTER_SOCIAL_LINKS.map((social) => social.key)).toEqual(['instagram', 'facebook'])
    for (const social of FOOTER_SOCIAL_LINKS) {
      expect(social.href.startsWith('https://')).toBe(true)
      expect(social.label).toBeTruthy()
    }
  })
})
