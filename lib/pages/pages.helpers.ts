import type { PageTocEntry, SndPage, SndPageDocument } from '@/types/page'

const DIACRITICS: Record<string, string> = {
  č: 'c',
  ć: 'c',
  ž: 'z',
  š: 's',
  đ: 'd',
}

/**
 * Heading text to a stable anchor id.
 *
 * Stable is the point: the contents list is rendered on the server and the
 * headings it links to are rendered from the same string, so both sides have to
 * agree without passing anything between them.
 */
export function headingId(text: string): string {
  const normalised = text
    .toLowerCase()
    .replace(/[čćžšđ]/g, (char) => DIACRITICS[char] ?? char)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalised || 'sekcija'
}

const H2_PATTERN = /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi

function plainText(html: string): string {
  return html
    // Block ends become a space first: stripping every tag blindly would run
    // "<p>Prvi red.</p><p>Drugi red.</p>" together into one word. Inline tags
    // are dropped without one, so "<strong>Ga</strong>rancija" stays whole.
    .replace(/<\/(p|li|h[1-6]|div|tr|td|th|blockquote)\s*>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Puts an id on every `<h2>` and hands back the list of them.
 *
 * The editor writes plain headings; anchors are a rendering concern, not
 * something a person writing copy in SQL should have to remember. Duplicate
 * headings get a numeric suffix so two "Kako se prijavljuje" sections still
 * scroll to different places.
 */
export function buildPageDocument(page: SndPage): SndPageDocument {
  const toc: PageTocEntry[] = []
  const seen = new Map<string, number>()

  const html = page.content.replace(H2_PATTERN, (match, attrs: string | undefined, inner: string) => {
    const label = plainText(inner)
    if (!label) return match

    const base = headingId(label)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    const id = count === 0 ? base : `${base}-${count + 1}`

    toc.push({ id, label })

    const attributes = (attrs ?? '').replace(/\sid=(".*?"|'.*?'|[^\s>]+)/i, '')
    return `<h2${attributes} id="${id}">${inner}</h2>`
  })

  return { ...page, html, toc }
}

/** "21. oktobar 2025." - the date under the title. */
export function formatPageDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('sr-Latn-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return iso.slice(0, 10)
  }
}

/** Meta description: the summary if there is one, otherwise the opening lines. */
export function pageMetaDescription(page: Pick<SndPage, 'summary' | 'content'>): string {
  const source = page.summary?.trim() || plainText(page.content)
  if (source.length <= 160) return source
  return `${source.slice(0, 157).trimEnd()}…`
}
