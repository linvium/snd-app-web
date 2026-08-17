import { mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const DIR = path.join(process.cwd(), 'e2e/fixtures/images')

async function existsAndBigEnough(file: string, minBytes: number) {
  try {
    const info = await stat(file)
    return info.size >= minBytes
  } catch {
    return false
  }
}

export async function ensureTestImages() {
  await mkdir(DIR, { recursive: true })

  await sharp({
    create: { width: 1200, height: 900, channels: 3, background: { r: 46, g: 139, b: 95 } },
  })
    .jpeg({ quality: 85 })
    .toFile(path.join(DIR, 'test-image.jpg'))

  await sharp({
    create: { width: 1200, height: 900, channels: 3, background: { r: 232, g: 112, b: 58 } },
  })
    .jpeg({ quality: 85 })
    .toFile(path.join(DIR, 'test-image-2.jpg'))

  await sharp({
    create: { width: 600, height: 800, channels: 3, background: { r: 37, g: 99, b: 235 } },
  })
    .jpeg({ quality: 85 })
    .toFile(path.join(DIR, 'portrait-image.jpg'))

  const largePath = path.join(DIR, 'large-image.jpg')
  if (!(await existsAndBigEnough(largePath, 10 * 1024 * 1024 + 1))) {
    await writeFile(largePath, new Uint8Array(11 * 1024 * 1024).fill(255))
  }
}
