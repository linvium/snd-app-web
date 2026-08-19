import { expect, test, type Page } from '@playwright/test'

import { cleanupCreatedListings, trackListingFromPage } from '../helpers/cleanup'
import {
  fillDescribe,
  fillRequiredSteps,
  openNewListing,
  saveAsDraft,
  visible,
  waitForAutosave,
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
  test('forma je odmah tu, bez resume banera', async ({ page }) => {
    await start(page)
    await expect(visible(page, 'publish-form')).toBeVisible()
    await expect(page.getByTestId('draft-resume-banner')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Nastavi' })).toHaveCount(0)
  })

  test('nepotpun nacrt ne prolazi validaciju', async ({ page }) => {
    await start(page)
    await fillDescribe(page)
    await visible(page, 'save-draft-button').click()
    await expect(visible(page, 'error-summary')).toBeVisible()
    await expect(page).toHaveURL(/\/profile\/listings\/new/)
  })

  test('drugi odlazak na new ne nudi nastavak', async ({ page }) => {
    await start(page)
    await fillRequiredSteps(page, { itemValue: false })
    await saveAsDraft(page)
    trackListingFromPage(page, created)

    await page.goto('/profile/listings/new')
    await expect(visible(page, 'publish-form')).toBeVisible()
    await expect(page.getByTestId('draft-resume-banner')).toHaveCount(0)
    await expect(page.locator('#listing-title')).toHaveValue('')
  })

  test('sačuvan nacrt se vidi na listi i na edit-u', async ({ page }) => {
    await start(page)
    await fillRequiredSteps(page)
    await saveAsDraft(page)
    trackListingFromPage(page, created)

    await expect(page.locator('[data-listing-status="draft"]').first()).toBeVisible()
    await page.getByTestId('listing-actions').first().click()
    await page.getByTestId('listing-edit-link').click()
    await expect(page).toHaveURL(/\/profile\/listings\/[0-9a-f-]{36}\/edit/i)
    await expect(visible(page, 'publish-form')).toBeVisible()
    await expect(page.locator('#listing-title')).toHaveValue(/Bušilica Bosch/)
    await expect(page.locator('#listing-description')).toHaveValue(/bitova/)
    await expect(visible(page, 'photo-slot-0').getByText('Naslovna')).toBeVisible()
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
    await fillRequiredSteps(page)
    await page.locator('#listing-title').fill(uniqueTitle)
    await saveAsDraft(page)
    trackListingFromPage(page, created)

    await page.goto(`/search?q=${encodeURIComponent(uniqueTitle)}`)
    await expect(page.getByRole('heading', { name: uniqueTitle })).toHaveCount(0)
  })
})
