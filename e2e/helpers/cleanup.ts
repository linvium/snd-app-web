import type { APIRequestContext, Page } from '@playwright/test'

const UUID_RE =
  /\/(?:profile\/listings|listings\/new|api\/v1\/listings)\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i

export function listingIdFromUrl(url: string): string | null {
  return url.match(UUID_RE)?.[1] ?? null
}

export async function deleteListing(request: APIRequestContext, listingId: string) {
  const response = await request.delete(`/api/v1/listings/${listingId}`, {
    headers: { Accept: 'application/json' },
  })
  if (response.status() === 409) return
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Cleanup failed for ${listingId}: ${response.status()} ${await response.text()}`)
  }
}

export async function deleteOwnDrafts(request: APIRequestContext) {
  const response = await request.get('/api/v1/listings', { headers: { Accept: 'application/json' } })
  if (!response.ok()) return
  const payload = (await response.json()) as { data?: Array<{ id: string }> }
  for (const draft of payload.data ?? []) {
    await deleteListing(request, draft.id)
  }
}

export async function cleanupCreatedListings(page: Page, ids: Set<string>) {
  for (const id of ids) {
    await deleteListing(page.request, id).catch(() => undefined)
  }
  ids.clear()
  await deleteOwnDrafts(page.request).catch(() => undefined)
}

export function trackListingFromPage(page: Page, ids: Set<string>) {
  const id = listingIdFromUrl(page.url())
  if (id) ids.add(id)
  const highlight = new URL(page.url()).searchParams.get('highlight')
  if (highlight) ids.add(highlight)
}
