/**
 * Editorial pages (`public.pages`): help, guarantee, legal copy.
 *
 * The same row is rendered twice — as a full SSR document at /{category}/{slug}
 * for search engines and direct links, and inside the support sheet for someone
 * who asked a question in the middle of a booking and should not lose the page
 * they were on.
 */

/** Route namespaces. Each one needs a matching folder under app/(main). */
export const PAGE_CATEGORIES = ['support', 'legal'] as const

export type PageCategory = (typeof PAGE_CATEGORIES)[number]

export interface SndPage {
  id: string
  slug: string
  category: PageCategory
  title: string
  summary: string | null
  /** Trusted, team-authored HTML. Rendered as-is. */
  content: string
  published_at: string
}

/** The listing shape: everything but the body, for index pages and the sheet's menu. */
export type SndPageSummary = Omit<SndPage, 'content'>

/** One entry of the in-page table of contents, built from the body's <h2>s. */
export interface PageTocEntry {
  id: string
  label: string
}

export interface SndPageDocument extends SndPage {
  /** `content` with stable ids on its headings, so the contents list can link into it. */
  html: string
  toc: PageTocEntry[]
}
