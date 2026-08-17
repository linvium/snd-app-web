import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { loadOwnedListing } from '@/lib/listings/listings.server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!UUID_RE.test(id)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Oglas nije pronađen.')
  }

  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const loaded = await loadOwnedListing(auth.supabase, id, auth.userId)
  if ('response' in loaded) return loaded.response

  let body: { order?: string[] }
  try {
    body = (await request.json()) as { order?: string[] }
  } catch {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Neispravan zahtev.')
  }

  const order = body.order
  if (!Array.isArray(order) || order.length === 0) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Pošalji redosled slika.')
  }

  const existing = new Set(loaded.listing.images.map((image) => image.id))
  if (order.length !== existing.size || order.some((imageId) => !existing.has(imageId))) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Redosled slika nije ispravan.')
  }

  for (const [index, imageId] of order.entries()) {
    const { error } = await auth.supabase
      .from('listing_images')
      .update({ sort_order: index })
      .eq('id', imageId)
      .eq('listing_id', id)
    if (error) {
      console.error('[listings] reorder failed', error)
      return apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da promenimo redosled.')
    }
  }

  return apiOk({ order })
}
