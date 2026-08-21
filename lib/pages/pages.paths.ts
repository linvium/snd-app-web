import { PAGE_CATEGORIES, type PageCategory } from '@/types/page'

/** /support/faq, /legal/terms - the row's own address. */
export function pagePath(category: PageCategory, slug: string): string {
  return `/${category}/${slug}`
}

export function isPageCategory(value: string): value is PageCategory {
  return (PAGE_CATEGORIES as readonly string[]).includes(value)
}

export interface ParsedPagePath {
  category: PageCategory
  slug: string
}

/**
 * Reads a href back into the row it points at, or null if it points anywhere
 * else. This is what lets one click handler on the whole app decide whether a
 * link belongs in the support sheet or in the browser: an editor writing
 * `<a href="/support/guarantee">` in the body of a page gets the sheet for
 * free, and `<a href="https://...">` or `mailto:` keeps its normal behaviour.
 */
export function parsePagePath(href: string): ParsedPagePath | null {
  if (!href.startsWith('/')) return null

  const [pathname] = href.split(/[?#]/)
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 2) return null

  const [category, slug] = segments
  if (!isPageCategory(category)) return null
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null

  return { category, slug }
}

/** True for /support and /legal themselves, and for anything under them. */
export function isPagesPath(pathname: string): boolean {
  const [first] = pathname.split('/').filter(Boolean)
  return first !== undefined && isPageCategory(first)
}

/** What the index of a category is called where it is linked to. */
export const PAGE_CATEGORY_LABELS: Record<PageCategory, string> = {
  support: 'Pomoć i podrška',
  legal: 'Pravni dokumenti',
}
