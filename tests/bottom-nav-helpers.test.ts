import { describe, expect, it } from 'vitest'

import { BOTTOM_NAV_LINKS, bottomNavItemIsActive } from '@/lib/layout/bottom-nav.helpers'

describe('bottom nav', () => {
  it('puts saved items on mobile instead of search', () => {
    expect(BOTTOM_NAV_LINKS.map((item) => item.href)).toEqual([
      '/',
      '/profile/favorites',
      '/profile/listings/new',
      '/profile/requests',
      '/profile',
    ])
    expect(BOTTOM_NAV_LINKS.map((item) => item.label)).toContain('Omiljeni')
    expect(BOTTOM_NAV_LINKS.map((item) => item.label)).not.toContain('Pretraga')
  })

  it('keeps profile active only on profile pages that are not requests or favorites', () => {
    expect(bottomNavItemIsActive('/profile', '/profile')).toBe(true)
    expect(bottomNavItemIsActive('/profile/edit', '/profile')).toBe(true)
    expect(bottomNavItemIsActive('/profile/requests', '/profile')).toBe(false)
    expect(bottomNavItemIsActive('/profile/favorites', '/profile')).toBe(false)
    expect(bottomNavItemIsActive('/profile/favorites', '/profile/favorites')).toBe(true)
    expect(bottomNavItemIsActive('/profile/requests/abc', '/profile/requests')).toBe(true)
  })
})
