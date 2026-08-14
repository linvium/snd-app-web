import { redirect } from 'next/navigation'

/**
 * /category/<slug> is a shortcut into search, not a page of its own
 * (doc 03 §11). Whatever location the incoming link carried is forwarded, so
 * following a category link does not silently widen the search back to the
 * whole country.
 */
export default async function CategoryRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const incoming = await searchParams

  const query = new URLSearchParams({ category: slug })
  for (const key of ['city', 'lat', 'lng', 'radius', 'from', 'to'] as const) {
    const value = incoming[key]
    const single = Array.isArray(value) ? value[0] : value
    if (single) query.set(key, single)
  }

  redirect(`/search?${query.toString()}`)
}
