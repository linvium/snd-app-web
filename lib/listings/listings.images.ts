import {
  MAX_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
} from '@/types/listing'

export class ImageProcessingError extends Error {
  constructor(
    readonly code: 'UPLOAD_TOO_LARGE' | 'VALIDATION_FAILED',
    message: string
  ) {
    super(message)
    this.name = 'ImageProcessingError'
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

const SIZES = {
  thumbnail: { width: 400, height: 300, quality: 80 },
  medium: { width: 800, height: 600, quality: 85 },
  large: { width: 1600, height: 1200, quality: 85 },
} as const

export interface ProcessedListingImage {
  width: number
  height: number
  isPortrait: boolean
  variants: {
    thumbnail: { webp: Buffer; jpeg: Buffer }
    medium: { webp: Buffer; jpeg: Buffer }
    large: { webp: Buffer; jpeg: Buffer }
  }
}

export async function processListingImage(buffer: Buffer): Promise<ProcessedListingImage> {
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ImageProcessingError('UPLOAD_TOO_LARGE', 'Slika sme da ima najviše 10 MB.')
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
      throw new ImageProcessingError(
        'VALIDATION_FAILED',
        'HEIC slike nisu podržane. Sačuvaj sliku kao JPEG ili PNG.'
      )
    }
    throw new ImageProcessingError(
      'VALIDATION_FAILED',
      'Koristi JPEG, PNG, WebP ili AVIF sliku.'
    )
  }

  let width = metadata?.width ?? 0
  let height = metadata?.height ?? 0
  if (width <= 0 || height <= 0) {
    throw new ImageProcessingError(
      'VALIDATION_FAILED',
      'Nismo mogli da pročitamo dimenzije slike. Probaj drugi fajl.'
    )
  }

  const isPortrait = height > width
  const scale = Math.max(MIN_IMAGE_WIDTH / width, MIN_IMAGE_HEIGHT / height, 1)
  const pipeline =
    scale > 1
      ? sharp(buffer, { failOn: 'none', animated: false })
          .rotate()
          .resize(Math.ceil(width * scale), Math.ceil(height * scale), {
            fit: 'fill',
            kernel: 'lanczos3',
          })
      : sharp(buffer, { failOn: 'none', animated: false }).rotate()

  const variants = {} as ProcessedListingImage['variants']

  for (const [name, size] of Object.entries(SIZES) as [
    keyof typeof SIZES,
    (typeof SIZES)[keyof typeof SIZES],
  ][]) {
    const resized = pipeline.clone().resize(size.width, size.height, {
      fit: 'cover',
      position: 'centre',
    })

    const [webp, jpeg] = await Promise.all([
      resized.clone().webp({ quality: size.quality }).toBuffer(),
      resized.clone().jpeg({ quality: size.quality, mozjpeg: true }).toBuffer(),
    ])

    variants[name] = { webp, jpeg }
  }

  return { width, height, isPortrait, variants }
}

export { MAX_LISTING_IMAGES }
