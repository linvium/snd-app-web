import { NextRequest } from 'next/server'

import { requireUser } from '@/lib/api/auth'
import { apiError, apiOk, ERROR_CODES } from '@/lib/api/response'
import { AvatarProcessingError, processAvatarImage } from '@/lib/profiles/profile.avatar'

const BUCKET = 'avatars'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof Blob) || file.size === 0) {
    return apiError(422, ERROR_CODES.VALIDATION_FAILED, 'Izaberi sliku.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let processed
  try {
    processed = await processAvatarImage(buffer)
  } catch (error) {
    if (error instanceof AvatarProcessingError) {
      console.warn('[profile] avatar rejected', error.code, error.message, {
        bytes: buffer.length,
        type: file.type,
      })
      if (error.code === 'UPLOAD_TOO_LARGE') {
        return apiError(422, ERROR_CODES.UPLOAD_TOO_LARGE, error.message)
      }
      return apiError(422, ERROR_CODES.VALIDATION_FAILED, error.message)
    }
    console.error('[profile] avatar process failed', error)
    return apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da obradimo sliku.')
  }

  const imageId = crypto.randomUUID()
  const folder = auth.userId
  const uploads = [
    { path: `${folder}/${imageId}.webp`, body: processed.webp, type: 'image/webp' },
    { path: `${folder}/${imageId}.jpg`, body: processed.jpeg, type: 'image/jpeg' },
  ]

  const { data: existing } = await auth.supabase.storage.from(BUCKET).list(folder)

  for (const upload of uploads) {
    const { error } = await auth.supabase.storage.from(BUCKET).upload(upload.path, upload.body, {
      contentType: upload.type,
      upsert: false,
      cacheControl: '3600',
    })
    if (error) {
      console.error('[profile] avatar upload failed', error)
      await auth.supabase.storage.from(BUCKET).remove(uploads.map((item) => item.path))
      return apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da otpremimo sliku.')
    }
  }

  const {
    data: { publicUrl },
  } = auth.supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${imageId}.webp`)

  const { error } = await auth.supabase
    .from('user_profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', auth.userId)

  if (error) {
    console.error('[profile] avatar update failed', error)
    await auth.supabase.storage.from(BUCKET).remove(uploads.map((item) => item.path))
    return apiError(500, ERROR_CODES.INTERNAL, 'Nismo mogli da sačuvamo sliku.')
  }

  const stale = (existing ?? [])
    .map((item) => `${folder}/${item.name}`)
    .filter((path) => !uploads.some((upload) => upload.path === path))
  if (stale.length > 0) {
    await auth.supabase.storage.from(BUCKET).remove(stale)
  }

  return apiOk({ avatar_url: publicUrl })
}
