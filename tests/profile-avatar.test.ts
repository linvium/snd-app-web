import { describe, expect, it } from 'vitest'

import { AVATAR_SIZE_PX } from '@/types'

describe('processAvatarImage', () => {
  it('crops any aspect ratio to a square avatar', async () => {
    const sharp = (await import('sharp')).default
    const { processAvatarImage } = await import('@/lib/profiles/profile.avatar')
    const buffer = await sharp({
      create: { width: 800, height: 400, channels: 3, background: '#336699' },
    })
      .jpeg()
      .toBuffer()

    const result = await processAvatarImage(buffer)
    const webp = await sharp(result.webp).metadata()
    const jpeg = await sharp(result.jpeg).metadata()

    expect(webp.width).toBe(AVATAR_SIZE_PX)
    expect(webp.height).toBe(AVATAR_SIZE_PX)
    expect(jpeg.width).toBe(AVATAR_SIZE_PX)
    expect(jpeg.height).toBe(AVATAR_SIZE_PX)
    expect(result.webp.byteLength).toBeGreaterThan(0)
  })

  it('upscales a small square instead of rejecting it', async () => {
    const sharp = (await import('sharp')).default
    const { processAvatarImage } = await import('@/lib/profiles/profile.avatar')
    const buffer = await sharp({
      create: { width: 80, height: 80, channels: 3, background: '#114477' },
    })
      .png()
      .toBuffer()

    const result = await processAvatarImage(buffer)
    const jpeg = await sharp(result.jpeg).metadata()
    expect(jpeg.width).toBe(AVATAR_SIZE_PX)
    expect(jpeg.height).toBe(AVATAR_SIZE_PX)
  })

  it('rejects non-image bytes', async () => {
    const { processAvatarImage, AvatarProcessingError } = await import(
      '@/lib/profiles/profile.avatar'
    )
    await expect(processAvatarImage(Buffer.from('not-an-image'))).rejects.toBeInstanceOf(
      AvatarProcessingError
    )
  })
})
