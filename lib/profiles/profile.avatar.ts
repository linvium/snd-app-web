import { AVATAR_SIZE_PX, MAX_AVATAR_BYTES } from '@/types'

export class AvatarProcessingError extends Error {
  constructor(
    readonly code: 'UPLOAD_TOO_LARGE' | 'VALIDATION_FAILED',
    message: string
  ) {
    super(message)
    this.name = 'AvatarProcessingError'
  }
}

const SHARP_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff', 'heif'])

function isIsoBmff(buffer: Buffer): boolean {
  return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp'
}

function brandAt(buffer: Buffer, offset: number): string {
  return buffer.toString('ascii', offset, offset + 4).toLowerCase()
}

function looksLikeHeic(buffer: Buffer): boolean {
  if (!isIsoBmff(buffer)) return false
  const heicBrands = new Set(['heic', 'heix', 'heif', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'])
  if (heicBrands.has(brandAt(buffer, 8))) return true
  for (let offset = 16; offset + 4 <= Math.min(buffer.length, 32); offset += 4) {
    if (heicBrands.has(brandAt(buffer, offset))) return true
  }
  return false
}

export interface ProcessedAvatar {
  webp: Buffer
  jpeg: Buffer
}

export async function processAvatarImage(buffer: Buffer): Promise<ProcessedAvatar> {
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new AvatarProcessingError('UPLOAD_TOO_LARGE', 'Slika sme da ima najviše 10 MB.')
  }

  const sharp = (await import('sharp')).default
  const source = sharp(buffer, { failOn: 'none', animated: false }).rotate()

  let metadata
  try {
    metadata = await source.metadata()
  } catch {
    metadata = undefined
  }

  const format = metadata?.format
  const canDecode = Boolean(format && SHARP_FORMATS.has(format) && format !== 'heif')

  if (!canDecode) {
    if (looksLikeHeic(buffer) || format === 'heif') {
      throw new AvatarProcessingError(
        'VALIDATION_FAILED',
        'HEIC slike nisu podržane. Sačuvaj sliku kao JPEG ili PNG.'
      )
    }
    throw new AvatarProcessingError(
      'VALIDATION_FAILED',
      'Koristi JPEG, PNG, WebP ili AVIF sliku.'
    )
  }

  const width = metadata?.width ?? 0
  const height = metadata?.height ?? 0
  if (width <= 0 || height <= 0) {
    throw new AvatarProcessingError(
      'VALIDATION_FAILED',
      'Nismo mogli da pročitamo dimenzije slike. Probaj drugi fajl.'
    )
  }

  const square = sharp(buffer, { failOn: 'none', animated: false })
    .rotate()
    .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, {
      fit: 'cover',
      position: 'centre',
    })

  const [webp, jpeg] = await Promise.all([
    square.clone().webp({ quality: 85 }).toBuffer(),
    square.clone().jpeg({ quality: 85, mozjpeg: true }).toBuffer(),
  ])

  return { webp, jpeg }
}
