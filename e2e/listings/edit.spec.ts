import { expect, test, type Page } from '@playwright/test'

import { VALID_LISTING } from '../fixtures/listing-data'
import { cleanupCreatedListings, listingIdFromUrl, trackListingFromPage } from '../helpers/cleanup'
import {
  fillRequiredSteps,
  mockGeocode,
  openAddLocation,
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
  await page.goto(`/profile/listings/${listingId}/edit`)
  await expect(visible(page, 'publish-form')).toBeVisible()
}

test.describe('edit published listing', () => {
  test('izmena naslova objavljenog oglasa', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    const before = await page.request.get(`/api/v1/listings/${listingId}`)
    const slug = ((await before.json()) as { data: { slug: string } }).data.slug

    await openEdit(page, listingId)
    await expect(page).toHaveURL(new RegExp(`/profile/listings/${listingId}/edit`))
    await expect(page.getByRole('heading', { name: 'Izmeni oglas' })).toBeVisible()
    await expect(visible(page, 'publish-button')).toHaveText('Sačuvaj izmene')
    await expect(page.locator('#listing-title')).toHaveValue(VALID_LISTING.title)

    await page.locator('#listing-title').fill('Bušilica Bosch GSB 13 RE Plus')
    await visible(page, 'publish-button').click()
    await page.waitForURL((url) => url.pathname === '/profile/listings')
    await expectToast(page, 'Izmene su sačuvane.')

    const after = await page.request.get(`/api/v1/listings/${listingId}`)
    expect(((await after.json()) as { data: { slug: string } }).data.slug).toBe(slug)
    await page.goto(`/listings/${slug}`)
    await expect(page.getByRole('heading', { name: 'Bušilica Bosch GSB 13 RE Plus' })).toBeVisible()
  })

  test('arhiviranje oglasa sa forme', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    await openEdit(page, listingId)
    await visible(page, 'pause-button').click()
    await expectToast(page, 'Oglas je arhiviran.')

    await page.goto(`/search?q=${encodeURIComponent(VALID_LISTING.title)}`)
    await expect(page.getByRole('heading', { name: VALID_LISTING.title })).toHaveCount(0)
    created.add(listingId)
  })

  test('action meni arhivira i vraća oglas', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    await page.goto('/profile/listings')
    const card = page.locator(`[data-listing-id="${listingId}"]`)
    await expect(card).toHaveAttribute('data-listing-status', 'published')

    await card.getByTestId('listing-actions').click()
    await page.getByTestId('listing-status-menu').click()
    await expect(page.getByTestId('listing-status-draft')).toBeVisible()
    await expect(page.getByTestId('listing-status-published')).toBeVisible()
    await expect(page.getByTestId('listing-status-paused')).toBeVisible()
    await expect(page.getByTestId('listing-status-published')).toBeDisabled()
    await page.getByTestId('listing-status-paused').click()
    await expectToast(page, 'Oglas je arhiviran.')
    await expect(card).toHaveAttribute('data-listing-status', 'paused')
    await expect(card.getByText('Arhiviran')).toBeVisible()

    await card.getByTestId('listing-actions').click()
    await page.getByTestId('listing-status-menu').click()
    await page.getByTestId('listing-status-published').click()
    await expectToast(page, 'Oglas je ponovo aktivan.')
    await expect(card).toHaveAttribute('data-listing-status', 'published')
    await expect(card.getByText('Objavljen')).toBeVisible()
  })

  test('action meni vraća oglas u nacrt', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    const listing = await page.request.get(`/api/v1/listings/${listingId}`)
    const slug = ((await listing.json()) as { data: { slug: string } }).data.slug

    await page.goto('/profile/listings')
    const card = page.locator(`[data-listing-id="${listingId}"]`)
    await card.getByTestId('listing-actions').click()
    await page.getByTestId('listing-status-menu').click()
    await page.getByTestId('listing-status-draft').click()
    await expectToast(page, 'Oglas je vraćen u nacrt.')
    await expect(card).toHaveAttribute('data-listing-status', 'draft')
    await expect(card.getByText('Nacrt')).toBeVisible()

    const publicPage = await page.request.get(`/listings/${slug}`)
    expect(publicPage.status()).toBe(404)

    await card.getByTestId('listing-actions').click()
    await page.getByTestId('listing-status-menu').click()
    await page.getByTestId('listing-status-published').click()
    await expectToast(page, 'Oglas je objavljen.')
    await expect(card).toHaveAttribute('data-listing-status', 'published')
    const republished = await page.request.get(`/listings/${slug}`)
    expect(republished.ok()).toBeTruthy()
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
    await page.waitForURL((url) => url.pathname === '/profile/listings')
    created.delete(listingId)

    const response = await page.request.get(`/listings/${slug}`)
    expect(response.status()).toBe(404)
  })

  test('stari edit URL radi redirect', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    await page.goto(`/listings/new/${listingId}`)
    await expect(page).toHaveURL(new RegExp(`/profile/listings/${listingId}/edit`))
    await expect(visible(page, 'publish-form')).toBeVisible()
  })

  test('autocomplete adrese radi i na edit-u', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog bez aktivne rezervacije')
    const listingId = await publishOwnListing(page)
    await openEdit(page, listingId)
    await mockGeocode(page)
    await openAddLocation(page)
    await page.locator('#location-address').fill('Kne')
    await expect(page.getByTestId('geocode-results')).toBeVisible()
    await page.getByTestId('geocode-result').first().click()
    await expect(page.locator('#location-address')).toHaveValue(/Knez Mihailova/)
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
    await expect(page).toHaveURL(/\/profile\/listings\/.+\/edit/)
    if (listingId) {
      const stillThere = await page.request.get(`/api/v1/listings/${listingId}`)
      expect(stillThere.ok()).toBeTruthy()
    }
  })
})
