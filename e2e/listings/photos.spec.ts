import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

import { IMAGE_PATHS } from '../fixtures/listing-data'
import { cleanupCreatedListings, listingIdFromUrl, trackListingFromPage } from '../helpers/cleanup'
import {
  expectToast,
  moveSecondPhotoToCover,
  openNewListing,
  uploadPhotos,
  visible,
  waitForCoverPhoto,
} from '../helpers/form'

const created = new Set<string>()

async function start(page: Page) {
  await openNewListing(page)
  trackListingFromPage(page, created)
}

test.afterEach(async ({ page }) => {
  await cleanupCreatedListings(page, created)
})

test.describe('listing photos', () => {
  test('upload jedne slike', async ({ page }) => {
    await start(page)
    const fileChooserPromise = page.waitForEvent('filechooser')
    await visible(page, 'photo-slot-0').click()
    const chooser = await fileChooserPromise
    const upload = page.waitForResponse(
      (res) => res.url().includes('/images') && res.request().method() === 'POST'
    )
    await chooser.setFiles(IMAGE_PATHS.landscape)
    await expect(page.getByTestId('photo-upload-progress').first()).toBeVisible()
    const response = await upload
    const body = (await response.json()) as { data?: Record<string, unknown> }
    expect(body.data).toMatchObject({
      id: expect.any(String),
      thumbnail_url: expect.any(String),
      sort_order: 0,
    })
    expect(body.data).not.toHaveProperty('width')
    expect(body.data).not.toHaveProperty('height')
    await waitForCoverPhoto(page)
  })

  test('blokada devete slike', async ({ page }) => {
    await start(page)
    const jpeg = readFileSync(IMAGE_PATHS.landscape)
    const files = Array.from({ length: 8 }, (_, index) => ({
      name: `photo-${index}.jpg`,
      mimeType: 'image/jpeg',
      buffer: jpeg,
    }))
    await page.getByTestId('photo-file-input').setInputFiles(files)
    await expect(page.getByTestId('photo-remove')).toHaveCount(8, { timeout: 60_000 })
    await expect(page.getByTestId('photo-upload-progress')).toHaveCount(0)

    await page.getByTestId('photo-file-input').setInputFiles(IMAGE_PATHS.landscapeAlt)
    await expectToast(page, 'Možeš dodati najviše 8 slika.')
    await expect(page.getByTestId('photo-remove')).toHaveCount(8)
  })

  test('brisanje slike', async ({ page }) => {
    await start(page)
    await uploadPhotos(page, [IMAGE_PATHS.landscape])
    await waitForCoverPhoto(page)
    await page.getByTestId('photo-remove').click()
    await expect(page.getByTestId('photo-grid').locator('img')).toHaveCount(0)
    await expect(visible(page, 'photo-slot-0')).toHaveAttribute('aria-label', 'Dodaj sliku')
    await expect(page.getByTestId('photo-grid').getByText('Naslovna')).toHaveCount(0)
  })

  test('promena redosleda', async ({ page }) => {
    await start(page)
    const firstUpload = await uploadPhotos(page, [IMAGE_PATHS.landscape])
    const listingId = listingIdFromUrl(firstUpload.url())
    if (listingId) created.add(listingId)
    await waitForCoverPhoto(page)
    await uploadPhotos(page, [IMAGE_PATHS.landscapeAlt])
    await expect(page.getByTestId('photo-remove')).toHaveCount(2)

    const firstSrc = await visible(page, 'photo-slot-0').locator('img').getAttribute('src')
    await moveSecondPhotoToCover(page)
    await expect(visible(page, 'photo-slot-0').getByText('Naslovna')).toBeVisible()
    await expect(visible(page, 'photo-slot-0').locator('img')).not.toHaveAttribute('src', firstSrc ?? '')

    if (!listingId) throw new Error('Missing listing id after photo upload')
    await page.goto(`/profile/listings/${listingId}/edit`)
    await expect(visible(page, 'publish-form')).toBeVisible()
    await expect(visible(page, 'photo-slot-0').locator('img')).not.toHaveAttribute('src', firstSrc ?? '')
    await expect(visible(page, 'photo-slot-0').getByText('Naslovna')).toBeVisible()
  })

  test('prevelik fajl', async ({ page }) => {
    await start(page)
    await page.getByTestId('photo-file-input').setInputFiles([IMAGE_PATHS.large, IMAGE_PATHS.landscape])
    await expectToast(page, 'Slika sme da ima najviše 10 MB.')
    await waitForCoverPhoto(page)
  })
})
