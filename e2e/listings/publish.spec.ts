import { expect, test, type Page } from '@playwright/test'

import { IMAGE_PATHS, VALID_LISTING } from '../fixtures/listing-data'
import { cleanupCreatedListings, listingIdFromUrl, trackListingFromPage } from '../helpers/cleanup'
import {
  fillDescribe,
  fillItemValue,
  fillPrices,
  fillRequiredSteps,
  openNewListing,
  pickFirstLeafCategory,
  pickFirstLocation,
  publishListing,
  uploadPhotos,
  visible,
  waitForCoverPhoto,
  expectToast,
} from '../helpers/form'

const created = new Set<string>()

async function start(page: Page) {
  await openNewListing(page)
  trackListingFromPage(page, created)
}

test.afterEach(async ({ page }) => {
  await cleanupCreatedListings(page, created)
})

test.describe('publish listing', () => {
  test('kompletna objava', async ({ page }) => {
    await start(page)
    await fillRequiredSteps(page)
    await publishListing(page)
    trackListingFromPage(page, created)

    await expect(page).toHaveURL(/\/profile\/listings\?published=1/)
    await expectToast(page, 'Oglas je objavljen.')
    await expect(page.getByRole('heading', { name: VALID_LISTING.title })).toBeVisible()

    await page.goto(`/search?q=${encodeURIComponent(VALID_LISTING.title)}`)
    await expect(page.getByRole('heading', { name: VALID_LISTING.title })).toBeVisible()
  })

  test('greška na koraku 2 i 5 istovremeno', async ({ page }) => {
    await start(page)
    await fillDescribe(page)
    await pickFirstLeafCategory(page)
    await fillPrices(page)
    await fillItemValue(page)
    await visible(page, 'publish-button').click()

    const summary = visible(page, 'error-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('Popravi 2 stvari pre objave')
    await expect(summary.getByRole('button', { name: /Korak 2/ })).toBeVisible()
    await expect(summary.getByRole('button', { name: /Korak 5/ })).toBeVisible()
    await expect(page.getByTestId('step-badge-2').first()).toHaveAttribute('data-state', 'error')
    await expect(page.getByTestId('step-badge-5').first()).toHaveAttribute('data-state', 'error')
    await expect(page).toHaveURL(/\/listings\/new\//)
    expect(listingIdFromUrl(page.url())).toBeTruthy()
  })

  test('predlog kategorije se ne postavlja sam', async ({ page }) => {
    await start(page)
    await page.locator('#listing-title').fill('Bušilica Bosch')
    await expect(visible(page, 'category-suggestion')).toBeVisible()
    await expect(visible(page, 'category-suggestion')).toContainText('Predlažemo')
    await expect(visible(page, 'category-picker')).toContainText('Izaberi kategoriju')

    await page.getByTestId('category-suggestion-chip').first().click()
    await expect(visible(page, 'category-picker')).not.toContainText('Izaberi kategoriju')
  })

  test('neispravna cena za 3 dana', async ({ page }) => {
    await start(page)
    await fillDescribe(page)
    await fillPrices(page, { price1Day: '800', price3Days: '2500', price7Days: '' })
    await expect(page.getByText(/2\.400/)).toBeVisible()

    await visible(page, 'publish-button').click()
    await expect(page).toHaveURL(/\/listings\/new\//)
    await expect(visible(page, 'error-summary')).toBeVisible()
  })

  test('ALL CAPS naslov je upozorenje, ne greška', async ({ page }) => {
    await start(page)
    await fillDescribe(page, { title: 'BUSILICA BOSCH GSB RE' })
    await expect(page.getByText('Naslov ispisan velikim slovima izgleda kao vika.')).toBeVisible()

    await uploadPhotos(page, [IMAGE_PATHS.landscape])
    await waitForCoverPhoto(page)
    await pickFirstLeafCategory(page)
    await fillPrices(page)
    await pickFirstLocation(page)
    await fillItemValue(page)
    await publishListing(page)
    trackListingFromPage(page, created)
    await expect(page).toHaveURL(/\/profile\/listings\?published=1/)
  })
})
