import { expect, test, type Page } from '@playwright/test'

import { IMAGE_PATHS } from '../fixtures/listing-data'
import { cleanupCreatedListings, trackListingFromPage } from '../helpers/cleanup'
import {
  fillDescribe,
  fillPrices,
  openNewListing,
  uploadPhotos,
  visible,
  waitForAutosave,
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

test.describe('draft listing', () => {
  test('podaci ostaju posle refresh-a', async ({ page }) => {
    await start(page)
    await fillDescribe(page)
    await uploadPhotos(page, [IMAGE_PATHS.landscape])
    await waitForCoverPhoto(page)
    await fillPrices(page, { price1Day: '800', price3Days: '', price7Days: '' })
    await waitForAutosave(page)

    await page.reload()
    await expect(visible(page, 'publish-form')).toBeVisible()
    await expect(page.locator('#listing-title')).toHaveValue(/Bušilica Bosch/)
    await expect(page.locator('#listing-description')).toHaveValue(/bitova/)
    await expect(visible(page, 'photo-slot-0').getByText('Naslovna')).toBeVisible()
  })

  test('banner Nastavi / Počni novi', async ({ page }) => {
    await start(page)
    await fillDescribe(page, { title: 'Nacrt za nastavak' })
    await waitForAutosave(page)

    await page.goto('/listings/new')
    const banner = visible(page, 'draft-resume-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('Nastavi')
    await page.getByRole('button', { name: 'Nastavi' }).click()
    await page.waitForURL(/\/listings\/new\/[0-9a-f-]{36}/i)
    trackListingFromPage(page, created)
    await expect(page.locator('#listing-title')).toHaveValue('Nacrt za nastavak')
  })

  test('indikator autosave-a', async ({ page }) => {
    await start(page)
    await page.locator('#listing-title').fill('Autosave naslov')
    await expect(visible(page, 'autosave-indicator')).toHaveText(/Snimam/)
    await waitForAutosave(page)
  })

  test('nacrt nije vidljiv u pretrazi', async ({ page }) => {
    const uniqueTitle = `Nacrt-${crypto.randomUUID()}`
    await start(page)
    await fillDescribe(page, { title: uniqueTitle })
    await waitForAutosave(page)

    await page.goto(`/search?q=${encodeURIComponent(uniqueTitle)}`)
    await expect(page.getByRole('heading', { name: uniqueTitle })).toHaveCount(0)
  })
})
