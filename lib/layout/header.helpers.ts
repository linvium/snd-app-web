export const HEADER_UTILITY_LINKS = [
  { href: '/kako-funkcionise', label: 'Kako funkcioniše' },
  { href: '/garancija', label: 'Garancija' },
  { href: '/faq', label: 'Česta pitanja' },
  { href: '/contact', label: 'Kontakt' },
] as const

/** Desktop header search is centered and capped; it does not fill leftover space. */
export const HEADER_SEARCH_MAX_WIDTH_PX = 640

/** Search sits in the header everywhere except the homepage, where it stays in the hero. */
export function headerShowsSearch(pathname: string): boolean {
  return pathname !== '/'
}

/** Homepage and search use the full viewport; other pages keep a centered shell. */
export function headerIsFullWidth(pathname: string): boolean {
  return pathname === '/' || pathname === '/search'
}
