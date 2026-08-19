import { isListingPublishPath } from '@/lib/listings/listings.paths'

export const BOTTOM_NAV_LINKS = [
  { href: '/', label: 'Početna' },
  { href: '/profile/favorites', label: 'Omiljeni' },
  { href: '/profile/listings/new', label: 'Objavi', emphasized: true },
  { href: '/profile/requests', label: 'Zahtevi' },
  { href: '/profile', label: 'Profil' },
] as const

export function bottomNavItemIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  if (href === '/profile') {
    return (
      pathname === '/profile' ||
      (pathname.startsWith('/profile') &&
        !pathname.startsWith('/profile/requests') &&
        !pathname.startsWith('/profile/favorites') &&
        !isListingPublishPath(pathname))
    )
  }
  return pathname.startsWith(href)
}
