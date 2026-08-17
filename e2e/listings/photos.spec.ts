import { expect, test, type Page } from '@playwright/test'

import { IMAGE_PATHS } from '../fixtures/listing-data'
import { cleanupCreatedListings, trackListingFromPage } from '../helpers/cleanup'
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
    await upload
    await waitForCoverPhoto(page)
  })

  test('blokada devete slike', async ({ page }) => {
    await start(page)
    const files = Array.from({ length: 8 }, () => IMAGE_PATHS.landscape)
    await page.getByTestId('photo-file-input').setInputFiles(files)
    await expect(visible(page, 'photo-slot-7').locator('img')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('photo-upload-progress')).toHaveCount(0)
    await expect(page.getByTestId('photo-remove')).toHaveCount(8)

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
    await uploadPhotos(page, [IMAGE_PATHS.landscape])
    await waitForCoverPhoto(page)
    await uploadPhotos(page, [IMAGE_PATHS.landscapeAlt])
    await expect(page.getByTestId('photo-remove')).toHaveCount(2)

    const firstSrc = await visible(page, 'photo-slot-0').locator('img').getAttribute('src')
    await moveSecondPhotoToCover(page)
    await expect(visible(page, 'photo-slot-0').getByText('Naslovna')).toBeVisible()
    await expect(visible(page, 'photo-slot-0').locator('img')).not.toHaveAttribute('src', firstSrc ?? '')

    await page.reload()
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
