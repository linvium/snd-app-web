import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import {
  ImageProcessingError,
  listingImageCreatedPayload,
  listingImageInsertRow,
  processListingImage,
} from '@/lib/listings/listings.images'
import { loadOwnedListing } from '@/lib/listings/listings.server'
import { MAX_LISTING_IMAGES } from '@/types/listing'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const BUCKET = 'listing-images'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
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

  if (loaded.listing.images.length >= MAX_LISTING_IMAGES) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Možeš dodati najviše 8 slika.')
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof Blob) || file.size === 0) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Izaberi sliku.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let processed
  try {
    processed = await processListingImage(buffer)
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      console.warn('[listings] image rejected', error.code, error.message, {
        bytes: buffer.length,
        type: file.type,
      })
      if (error.code === 'UPLOAD_TOO_LARGE') {
        return apiError(422, ERROR_CODES.UPLOAD_TOO_LARGE, error.message)
      }
      return apiError(422, ERROR_CODES.VALIDATION_FAILED, error.message)
    }
    console.error('[listings] image process failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da obradimo sliku.')
  }

  const imageId = crypto.randomUUID()
  const folder = `${id}/${imageId}`
  const uploads = [
    { path: `${folder}/thumbnail.webp`, body: processed.variants.thumbnail.webp, type: 'image/webp' },
    { path: `${folder}/thumbnail.jpg`, body: processed.variants.thumbnail.jpeg, type: 'image/jpeg' },
    { path: `${folder}/medium.webp`, body: processed.variants.medium.webp, type: 'image/webp' },
    { path: `${folder}/medium.jpg`, body: processed.variants.medium.jpeg, type: 'image/jpeg' },
    { path: `${folder}/large.webp`, body: processed.variants.large.webp, type: 'image/webp' },
    { path: `${folder}/large.jpg`, body: processed.variants.large.jpeg, type: 'image/jpeg' },
  ]

  for (const upload of uploads) {
    const { error } = await auth.supabase.storage.from(BUCKET).upload(upload.path, upload.body, {
      contentType: upload.type,
      upsert: false,
    })
    if (error) {
      console.error('[listings] storage upload failed', error)
      await auth.supabase.storage.from(BUCKET).remove(uploads.map((item) => item.path))
      return apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da otpremimo sliku.')
    }
  }

  const {
    data: { publicUrl: thumbnailUrl },
  } = auth.supabase.storage.from(BUCKET).getPublicUrl(`${folder}/thumbnail.webp`)
  const {
    data: { publicUrl: mediumUrl },
  } = auth.supabase.storage.from(BUCKET).getPublicUrl(`${folder}/medium.webp`)
  const {
    data: { publicUrl: largeUrl },
  } = auth.supabase.storage.from(BUCKET).getPublicUrl(`${folder}/large.webp`)

  const sortOrder = loaded.listing.images.length

  const { data: row, error } = await auth.supabase
    .from('listing_images')
    .insert(
      listingImageInsertRow({
        id: imageId,
        listingId: id,
        thumbnailUrl,
        mediumUrl,
        largeUrl,
        sortOrder,
      })
    )
    .select('id, thumbnail_url, sort_order')
    .single()

  if (error) {
    console.error('[listings] image insert failed', error)
    await auth.supabase.storage.from(BUCKET).remove(uploads.map((item) => item.path))
    if (error.code === 'check_violation') {
      return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Možeš dodati najviše 8 slika.')
    }
    return apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da sačuvamo sliku.')
  }

  return apiOk(listingImageCreatedPayload(row, processed.isPortrait), 201)
}
