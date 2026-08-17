import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { loadOwnedListing } from '@/lib/listings/listings.server'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const BUCKET = 'listing-images'

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await context.params
  if (!UUID_RE.test(id) || !UUID_RE.test(imageId)) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Slika nije pronađena.')
  }

  const auth = await requireUser()
  if (!auth.ok) return auth.response

  const loaded = await loadOwnedListing(auth.supabase, id, auth.userId)
  if ('response' in loaded) return loaded.response

  const image = loaded.listing.images.find((item) => item.id === imageId)
  if (!image) {
    return apiError(404, ERROR_CODES.NOT_FOUND, 'Slika nije pronađena.')
  }

  const folder = `${id}/${imageId}`
  await auth.supabase.storage.from(BUCKET).remove([
    `${folder}/thumbnail.webp`,
    `${folder}/thumbnail.jpg`,
    `${folder}/medium.webp`,
    `${folder}/medium.jpg`,
    `${folder}/large.webp`,
    `${folder}/large.jpg`,
  ])

  const { error } = await auth.supabase
    .from('listing_images')
    .delete()
    .eq('id', imageId)
    .eq('listing_id', id)

  if (error) {
    console.error('[listings] image delete failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da obrišemo sliku.')
  }

  const remaining = loaded.listing.images.filter((item) => item.id !== imageId)
  await Promise.all(
    remaining.map((item, index) =>
      auth.supabase
        .from('listing_images')
        .update({ sort_order: index })
        .eq('id', item.id)
        .eq('listing_id', id)
    )
  )

  return apiOk({ id: imageId })
}
