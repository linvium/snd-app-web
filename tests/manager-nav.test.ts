import { describe, expect, it } from 'vitest'

import {
  LEGACY_SETTINGS_REDIRECTS,
  MANAGER_BILLING,
  MANAGER_NAV,
  isManagerPath,
  isRequestThreadPath,
  managerBackHref,
  managerNavItemIsActive,
  managerSubpageTitle,
} from '@/lib/profiles'

describe('billing section', () => {
  it('sits in the rail as its own entry under /profile/billing', () => {
    const billing = MANAGER_NAV.find((item) => item.key === 'billing')
    expect(billing).toEqual({ key: 'billing', href: MANAGER_BILLING, label: 'Pretplata' })
    expect(MANAGER_BILLING).toBe('/profile/billing')
    expect(isManagerPath(MANAGER_BILLING)).toBe(true)
    expect(managerNavItemIsActive('/profile/billing', MANAGER_BILLING)).toBe(true)
  })

  it('names the page on the mobile back header', () => {
    expect(managerSubpageTitle('/profile/billing')).toBe('Pretplata i krediti')
    expect(managerBackHref('/profile/billing')).toBe('/profile')
  })
})

describe('managerNavItemIsActive', () => {
  it('matches the dashboard only on the exact root', () => {
    expect(managerNavItemIsActive('/profile', '/profile')).toBe(true)
    expect(managerNavItemIsActive('/profile/listings', '/profile')).toBe(false)
  })

  it('matches sections on their subtree', () => {
    expect(managerNavItemIsActive('/profile/requests', '/profile/requests')).toBe(true)
    expect(managerNavItemIsActive('/profile/requests/abc', '/profile/requests')).toBe(true)
    expect(managerNavItemIsActive('/profile/settings/edit', '/profile/settings')).toBe(true)
    expect(managerNavItemIsActive('/profile/listings', '/profile/settings')).toBe(false)
  })

  it('keeps Zahtevi in the rail — requests and messages are one section', () => {
    const labels = MANAGER_NAV.map((item) => item.label)
    expect(labels).toContain('Zahtevi')
    expect(labels).not.toContain('Poruke')
  })
})

describe('isRequestThreadPath', () => {
  it('is true only for a single conversation', () => {
    expect(isRequestThreadPath('/profile/requests/8f1')).toBe(true)
    expect(isRequestThreadPath('/profile/requests')).toBe(false)
    expect(isRequestThreadPath('/profile/requests/8f1/extra')).toBe(false)
  })
})

describe('isManagerPath', () => {
  it('covers the manager subtree but not the publish flow', () => {
    expect(isManagerPath('/profile')).toBe(true)
    expect(isManagerPath('/profile/settings/locations')).toBe(true)
    expect(isManagerPath('/profiles')).toBe(false)
    expect(isManagerPath('/profile/listings/new')).toBe(false)
    expect(isManagerPath('/profile/listings/abc/edit')).toBe(false)
  })
})

describe('managerSubpageTitle', () => {
  it('names settings subpages', () => {
    expect(managerSubpageTitle('/profile/settings/edit')).toBe('Izmeni profil')
    expect(managerSubpageTitle('/profile/settings/locations')).toBe('Moje lokacije')
    expect(managerSubpageTitle('/profile/settings/verification')).toBe('Verifikacija')
    expect(managerSubpageTitle('/profile/settings/profile')).toBe('Pregled profila')
    expect(managerSubpageTitle('/profile/settings')).toBe('Podešavanja')
  })

  it('leaves the dashboard and the thread without a back header', () => {
    expect(managerSubpageTitle('/profile')).toBeNull()
    expect(managerSubpageTitle('/profile/requests/abc')).toBeNull()
  })
})

describe('managerBackHref', () => {
  it('walks settings subpages back to Podešavanja', () => {
    expect(managerBackHref('/profile/settings/edit')).toBe('/profile/settings')
    expect(managerBackHref('/profile/settings')).toBe('/profile')
    expect(managerBackHref('/profile/listings')).toBe('/profile')
  })
})

describe('LEGACY_SETTINGS_REDIRECTS', () => {
  it('keeps the old flat paths pointing at the moved pages', () => {
    expect(LEGACY_SETTINGS_REDIRECTS['/profile/edit']).toBe('/profile/settings/edit')
    expect(LEGACY_SETTINGS_REDIRECTS['/profile/verification']).toBe('/profile/settings/verification')
    expect(LEGACY_SETTINGS_REDIRECTS['/profile/locations']).toBe('/profile/settings/locations')
  })
})
