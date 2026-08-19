import { expect, test, type Page } from '@playwright/test'

import { IMAGE_PATHS, VALID_LISTING } from '../fixtures/listing-data'
import { cleanupCreatedListings, listingIdFromUrl, trackListingFromPage } from '../helpers/cleanup'
import {
  confirmPublish,
  fillDescribe,
  fillItemValue,
  fillPrices,
  fillRequiredSteps,
  mockGeocode,
  openAddLocation,
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
    await expect(visible(page, 'publish-button')).toHaveText('Kreiraj i objavi')
    await expect(visible(page, 'pause-button')).toHaveCount(0)
    await publishListing(page)
    trackListingFromPage(page, created)

    await expect(page).toHaveURL(/\/profile\/listings\/?(?:\?.*)?$/)
    await expectToast(page, 'Oglas je objavljen.')
    await expect(page.getByRole('heading', { name: VALID_LISTING.title })).toBeVisible()
    await expect(page.locator('[data-listing-status="published"]').first()).toBeVisible()

    await page.goto(`/search?q=${encodeURIComponent(VALID_LISTING.title)}`)
    await expect(page.getByRole('heading', { name: VALID_LISTING.title })).toBeVisible()
  })

  test('objava bez vrednosti predmeta', async ({ page }) => {
    await start(page)
    await fillRequiredSteps(page, { itemValue: false })
    await publishListing(page)
    trackListingFromPage(page, created)
    await expect(page).toHaveURL(/\/profile\/listings\/?(?:\?.*)?$/)
  })

  test('greška na koraku 2 i 5 istovremeno', async ({ page }) => {
    await start(page)
    await fillDescribe(page)
    await pickFirstLeafCategory(page)
    await fillPrices(page)
    await fillItemValue(page)
    await visible(page, 'publish-button').click()
    await confirmPublish(page)

    const summary = visible(page, 'error-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('Popravi 2 stvari pre objave')
    await expect(summary.getByRole('button', { name: /Korak 2/ })).toBeVisible()
    await expect(summary.getByRole('button', { name: /Korak 5/ })).toBeVisible()
    await expect(page.getByTestId('step-badge-2').first()).toHaveAttribute('data-state', 'error')
    await expect(page.getByTestId('step-badge-5').first()).toHaveAttribute('data-state', 'error')
    await expect(page).toHaveURL(/\/profile\/listings\/new/)
    expect(listingIdFromUrl(page.url())).toBeNull()
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
    await confirmPublish(page)
    await expect(page).toHaveURL(/\/profile\/listings\/new/)
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
    await expect(page).toHaveURL(/\/profile\/listings\/?(?:\?.*)?$/)
  })

  test('garancija i predaja otvaraju se u novom tabu', async ({ page }) => {
    await start(page)
    await pickFirstLeafCategory(page)
    const guarantee = page.getByTestId('guarantee-link')
    await expect(guarantee).toHaveAttribute('href', '/garancija')
    await expect(guarantee).toHaveAttribute('target', '_blank')

    const pickup = page.getByTestId('pickup-help-link')
    await expect(pickup).toHaveAttribute('href', '/pomoc/predaja')
    await expect(pickup).toHaveAttribute('target', '_blank')
  })

  test('stari create URL radi redirect', async ({ page }) => {
    await page.goto('/listings/new')
    await expect(page).toHaveURL(/\/profile\/listings\/new/)
    await expect(visible(page, 'publish-form')).toBeVisible()
  })

  test('autocomplete adrese je popover', async ({ page }) => {
    await start(page)
    await mockGeocode(page)
    await openAddLocation(page)
    await page.locator('#location-address').fill('Kne')
    const results = page.getByTestId('geocode-results')
    await expect(results).toBeVisible()
    await page.getByTestId('geocode-result').first().click()
    await expect(page.locator('#location-address')).toHaveValue(/Knez Mihailova/)
    await expect(page.locator('#location-city')).toHaveValue('Beograd')
  })
})
