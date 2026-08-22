import { HEADER_UTILITY_LINKS } from '@/lib/layout/header.helpers'
import { isListingPublishPath } from '@/lib/listings/listings.paths'

/**
 * The footer's company column.
 *
 * Same four pages as the header's utility row, and deliberately the same array:
 * these are the questions someone has before they trust the site with a
 * booking, and two lists that are supposed to match but are typed out twice
 * stop matching within a month.
 */
export const FOOTER_COMPANY_LINKS = HEADER_UTILITY_LINKS

/**
 * The legal column.
 *
 * Written out rather than read from `pages` at request time: the footer renders
 * on every public page, and a database round trip for four links would be paid
 * on all of them. A newly published legal document is reachable through the
 * /legal index (linked at the foot of this column) and through the sitemap
 * without any code change; promoting it into the footer itself is one line here.
 */
export const FOOTER_LEGAL_LINKS = [
  { href: '/legal/terms', label: 'Uslovi korišćenja' },
  { href: '/legal/privacy', label: 'Politika privatnosti' },
  { href: '/support/cancellation-policy', label: 'Pravila otkazivanja' },
  { href: '/legal', label: 'Svi dokumenti' },
] as const

/**
 * Social profiles. Set the env vars to point them at the real accounts; the
 * defaults are the handles the brand is registered under.
 */
export const FOOTER_SOCIAL_LINKS = [
  {
    key: 'instagram' as const,
    label: 'Instagram',
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? 'https://www.instagram.com/stvarnadan',
  },
  {
    key: 'facebook' as const,
    label: 'Facebook',
    href: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? 'https://www.facebook.com/stvarnadan',
  },
] as const

/**
 * Where the footer belongs: the public site's documents, not its tools.
 *
 * Three exclusions. The manager never gets here - it runs on its own chrome.
 * The publish flow is a step form, and a footer under one reads as the end of
 * it. Search is the odd one: its map is pinned to the height of the viewport,
 * so a footer can only arrive by sliding underneath a map that will not scroll
 * away, and the page has the header's utility row and the bottom nav anyway.
 */
export function footerIsVisible(pathname: string): boolean {
  if (isListingPublishPath(pathname)) return false
  if (pathname === '/search') return false
  return true
}
