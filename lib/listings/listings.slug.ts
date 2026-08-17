const DIACRITICS: Record<string, string> = {
  š: 's',
  đ: 'dj',
  č: 'c',
  ć: 'c',
  ž: 'z',
}

const SLUG_MAX = 80

/** Title → URL slug. Serbian diacritics first, then anything non-alphanumeric. */
export function slugifyTitle(title: string): string {
  const lowered = title.trim().toLowerCase()
  const transliterated = lowered.replace(/[šđčćž]/g, (char) => DIACRITICS[char] ?? char)
  const dashed = transliterated
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!dashed) return 'oglas'

  if (dashed.length <= SLUG_MAX) return dashed

  const cut = dashed.slice(0, SLUG_MAX)
  const lastDash = cut.lastIndexOf('-')
  return (lastDash >= 20 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '')
}

export function nextSlugCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base
  return `${base}-${attempt}`
}
