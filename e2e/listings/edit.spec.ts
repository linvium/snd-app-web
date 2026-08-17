import { expect, test, type Page } from '@playwright/test'

import { VALID_LISTING } from '../fixtures/listing-data'
import { cleanupCreatedListings, listingIdFromUrl, trackListingFromPage } from '../helpers/cleanup'
import {
  fillRequiredSteps,
  openNewListing,
  publishListing,
  visible,
  expectToast,
} from '../helpers/form'

const created = new Set<string>()

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.project.name === 'owner-booking') return
  await cleanupCreatedListings(page, created)
})

async function publishOwnListing(page: Page) {
  await openNewListing(page)
  trackListingFromPage(page, created)
  await fillRequiredSteps(page)
  await publishListing(page)
  trackListingFromPage(page, created)
  const id = [...created].at(-1)
  if (!id) throw new Error('Missing listing id after publish')
  return id
}

async function openEdit(page: Page, listingId: string) {
  await page.goto(`/listings/new/${listingId}`)
  await expect(visible(page, 'publish-form')).toBeVisible()
}

test.describe('edit published listing', () => {
  test('izmena naslova objavljenog oglasa', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    const before = await page.request.get(`/api/v1/listings/${listingId}`)
    const slug = ((await before.json()) as { data: { slug: string } }).data.slug

    await openEdit(page, listingId)
    await expect(page.getByRole('heading', { name: 'Izmeni oglas' })).toBeVisible()
    await expect(visible(page, 'publish-button')).toHaveText('Sačuvaj izmene')

    await page.locator('#listing-title').fill('Bušilica Bosch GSB 13 RE Plus')
    await visible(page, 'publish-button').click()
    await page.waitForURL(/\/profile\/listings\?saved=1/)
    await expectToast(page, 'Izmene su sačuvane.')

    const after = await page.request.get(`/api/v1/listings/${listingId}`)
    expect(((await after.json()) as { data: { slug: string } }).data.slug).toBe(slug)
    await page.goto(`/listings/${slug}`)
    await expect(page.getByRole('heading', { name: 'Bušilica Bosch GSB 13 RE Plus' })).toBeVisible()
  })

  test('pauziranje oglasa', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    await openEdit(page, listingId)
    await visible(page, 'pause-button').click()
    await expectToast(page, 'Oglas je pauziran.')

    await page.goto(`/search?q=${encodeURIComponent(VALID_LISTING.title)}`)
    await expect(page.getByRole('heading', { name: VALID_LISTING.title })).toHaveCount(0)
    created.add(listingId)
  })

  test('brisanje bez aktivnih rezervacija', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    const listing = await page.request.get(`/api/v1/listings/${listingId}`)
    const slug = ((await listing.json()) as { data: { slug: string } }).data.slug

    await openEdit(page, listingId)
    await visible(page, 'delete-button').click()
    await expect(page.getByText('Ovo se ne može poništiti')).toBeVisible()
    await page.getByTestId('delete-confirm-button').click()
    await page.waitForURL((url) => url.pathname === '/')
    created.delete(listingId)

    const response = await page.request.get(`/listings/${slug}`)
    expect(response.status()).toBe(404)
  })
})

test.describe('locked fields with active booking', () => {
  test('zaključana polja uz aktivnu rezervaciju', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'owner-booking', 'Potreban je oglas sa paid rezervacijom')
    await page.goto('/profile/listings')
    await page.getByTestId('listing-edit-link').first().click()
    await expect(visible(page, 'publish-form')).toBeVisible()

    await expect(visible(page, 'category-picker')).toBeDisabled()
    await expect(page.getByTestId('cancellation-group').getByRole('radio').first()).toBeDisabled()
    await expect(page.locator('#item-value')).toBeDisabled()
    await expect(page.getByTestId('locked-field-notice').first()).toBeVisible()
    await expect(page.locator('#price-1')).toBeEnabled()
  })

  test('brisanje sa aktivnom rezervacijom', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'owner-booking', 'Potreban je oglas sa paid rezervacijom')
    await page.goto('/profile/listings')
    await page.getByTestId('listing-edit-link').first().click()
    await expect(visible(page, 'publish-form')).toBeVisible()
    const listingId = listingIdFromUrl(page.url())
    await visible(page, 'delete-button').click()
    await page.getByTestId('delete-confirm-button').click()
    await expectToast(page, 'Oglas se ne može obrisati dok traje aktivna rezervacija.')
    await expect(page).toHaveURL(/\/listings\/new\//)
    if (listingId) {
      const stillThere = await page.request.get(`/api/v1/listings/${listingId}`)
      expect(stillThere.ok()).toBeTruthy()
    }
  })
})
