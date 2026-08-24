import { isListingDetailPath } from '@/lib/listings/listings.paths'

/**
 * The utility row. Each one is an editorial page (`public.pages`), so a plain
 * click opens it in the support sheet over the current screen while the href
 * stays a real, indexable route for crawlers and for cmd-click.
 */
export const HEADER_UTILITY_LINKS = [
  { href: '/support/how-it-works', label: 'Kako funkcioniše' },
  { href: '/support/guarantee', label: 'Garancija' },
  { href: '/support/faq', label: 'Česta pitanja' },
  { href: '/support/contact', label: 'Kontakt' },
] as const

/** Desktop header search is centered and capped; it does not fill leftover space. */
export const HEADER_SEARCH_MAX_WIDTH_PX = 640

/** Search sits in the header everywhere except the homepage, where it stays in the hero. */
export function headerShowsSearch(pathname: string): boolean {
  return pathname !== '/'
}

/**
 * Homepage, search and the item page use the full viewport; other pages keep a
 * centered shell. The item page joins them because its own shell is wider than
 * the header's, so a centered header sat visibly inset from the content under
 * it - the logo starting to the right of the breadcrumb below it.
 */
export function headerIsFullWidth(pathname: string): boolean {
  return pathname === '/' || pathname === '/search' || isListingDetailPath(pathname)
}

/** Homepage header sits on the hero instead of pushing it down. */
export function headerOverlaysHero(pathname: string): boolean {
  return pathname === '/'
}

/**
 * Pulls homepage content under the in-flow header so the hero still starts at
 * the top of the viewport. Utility (h-8, lg only) + main (h-14 / md:h-[72px]).
 */
export const HEADER_HERO_OVERLAP_CLASS = '-mt-14 md:-mt-[72px] lg:-mt-[104px]'
