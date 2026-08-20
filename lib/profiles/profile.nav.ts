import { isListingPublishPath } from '@/lib/listings/listings.paths'

/**
 * The manager area lives under /profile. Its root is the dashboard ("Pregled");
 * everything that used to sit directly on /profile (profile overview, edit,
 * verification, locations) moved under /profile/settings.
 */
export const MANAGER_ROOT = '/profile'
export const MANAGER_LISTINGS = '/profile/listings'
export const MANAGER_REQUESTS = '/profile/requests'
export const MANAGER_FAVORITES = '/profile/favorites'
export const MANAGER_SETTINGS = '/profile/settings'

export const SETTINGS_PROFILE = '/profile/settings/profile'
export const SETTINGS_EDIT = '/profile/settings/edit'
export const SETTINGS_VERIFICATION = '/profile/settings/verification'
export const SETTINGS_LOCATIONS = '/profile/settings/locations'

export type ManagerNavKey = 'overview' | 'listings' | 'requests' | 'favorites' | 'settings'

export interface ManagerNavItem {
  key: ManagerNavKey
  href: string
  label: string
  /** Pushed to the bottom of the rail. */
  footer?: boolean
  /** Renders the unread-requests count. */
  counter?: 'unread'
}

/**
 * "Zahtevi" and "Poruke" are the same thing, so the rail carries one entry.
 * The label stays "Zahtevi" — it is what the rest of the product calls it.
 */
export const MANAGER_NAV: readonly ManagerNavItem[] = [
  { key: 'overview', href: MANAGER_ROOT, label: 'Pregled' },
  { key: 'listings', href: MANAGER_LISTINGS, label: 'Oglasi' },
  { key: 'requests', href: MANAGER_REQUESTS, label: 'Zahtevi', counter: 'unread' },
  { key: 'favorites', href: MANAGER_FAVORITES, label: 'Omiljeni' },
  { key: 'settings', href: MANAGER_SETTINGS, label: 'Podešavanja', footer: true },
] as const

export interface SettingsNavItem {
  href: string
  label: string
  description: string
}

export const SETTINGS_NAV: readonly SettingsNavItem[] = [
  {
    href: SETTINGS_PROFILE,
    label: 'Pregled profila',
    description: 'Kako te drugi vide i status verifikacije.',
  },
  {
    href: SETTINGS_EDIT,
    label: 'Izmeni profil',
    description: 'Ime, telefon, tekst o tebi i podrazumevana lokacija.',
  },
  {
    href: SETTINGS_VERIFICATION,
    label: 'Verifikacija',
    description: 'Potvrdi identitet i otključaj pun pristup.',
  },
  {
    href: SETTINGS_LOCATIONS,
    label: 'Moje lokacije',
    description: 'Adrese sa kojih predaješ i preuzimaš stvari.',
  },
] as const

/** Old flat paths kept working after the move under Podešavanja. */
export const LEGACY_SETTINGS_REDIRECTS: Readonly<Record<string, string>> = {
  '/profile/edit': SETTINGS_EDIT,
  '/profile/verification': SETTINGS_VERIFICATION,
  '/profile/locations': SETTINGS_LOCATIONS,
}

export function managerNavItemIsActive(pathname: string, href: string): boolean {
  if (href === MANAGER_ROOT) return pathname === MANAGER_ROOT
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The requests thread takes the whole screen on phones: the app header and the
 * bottom nav step aside so the composer can own the bottom edge.
 */
export function isRequestThreadPath(pathname: string): boolean {
  return /^\/profile\/requests\/[^/]+$/.test(pathname)
}

/** The manager shell (rail + full-height frame) applies to /profile and below. */
export function isManagerPath(pathname: string): boolean {
  if (isListingPublishPath(pathname)) return false
  return pathname === MANAGER_ROOT || pathname.startsWith(`${MANAGER_ROOT}/`)
}

/** Titles for the mobile back-header on manager subpages. */
export function managerSubpageTitle(pathname: string): string | null {
  if (isListingPublishPath(pathname)) return null
  if (isRequestThreadPath(pathname)) return null
  if (pathname === MANAGER_ROOT) return null
  if (pathname === SETTINGS_EDIT) return 'Izmeni profil'
  if (pathname === SETTINGS_LOCATIONS) return 'Moje lokacije'
  if (pathname === SETTINGS_VERIFICATION) return 'Verifikacija'
  if (pathname === SETTINGS_PROFILE) return 'Pregled profila'
  if (pathname.startsWith(MANAGER_SETTINGS)) return 'Podešavanja'
  if (pathname.startsWith(MANAGER_LISTINGS)) return 'Moji oglasi'
  if (pathname.startsWith(MANAGER_REQUESTS)) return 'Zahtevi'
  if (pathname.startsWith(MANAGER_FAVORITES)) return 'Omiljeni'
  return null
}

/** Where the mobile back arrow goes from a manager subpage. */
export function managerBackHref(pathname: string): string {
  if (pathname.startsWith(MANAGER_SETTINGS) && pathname !== MANAGER_SETTINGS) {
    return MANAGER_SETTINGS
  }
  return MANAGER_ROOT
}
