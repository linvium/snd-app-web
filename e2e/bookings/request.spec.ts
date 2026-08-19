import { expect, test, type Page } from '@playwright/test'

import { CONTACT_LISTING } from '../fixtures/users'
import { cleanupRentalRequests } from '../helpers/cleanup-requests'

const CONTACT_PATH = `/listings/${CONTACT_LISTING.slug}`

test.beforeAll(async () => {
  await cleanupRentalRequests()
})

test.afterAll(async () => {
  await cleanupRentalRequests()
})

async function openContactListing(page: Page) {
  await page.goto(CONTACT_PATH)
  await expect(page.getByRole('heading', { name: CONTACT_LISTING.title })).toBeVisible()
}

test.describe('guest contact', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('gost API ne može da kreira zahtev', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Jednom je dovoljno')
    const response = await request.post('/api/v1/bookings', {
      data: { listingId: '11111111-1111-4111-8111-111111111111', body: 'Zdravo' },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    })
    expect(response.status()).toBe(401)
  })

  test('gost na CTA ide na login', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Jednom je dovoljno')
    await openContactListing(page)
    await page.getByTestId('contact-owner-button').click()
    await expect(page).toHaveURL(/\/auth\/login\?next=.*e2e-oglas-sa-rezervacijom/)
  })
})

test.describe('owner cannot request own listing', () => {
  test('vlasnik ne vidi CTA na svom oglasu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'owner-booking', 'Potreban je nalog vlasnika')
    await openContactListing(page)
    await expect(page.getByTestId('contact-owner-button')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Izmeni oglas' })).toBeVisible()
  })

  test('API odbija zahtev vlasnika za sopstveni oglas', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'owner-booking', 'Potreban je nalog vlasnika')
    await page.goto('/profile/listings')
    const editHref = await page.getByTestId('listing-edit-link').first().getAttribute('href')
    const listingId = editHref?.match(/[0-9a-f-]{36}/i)?.[0]
    expect(listingId).toBeTruthy()

    const response = await page.request.post('/api/v1/bookings', {
      data: { listingId, body: 'Hoću svoj oglas.' },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    })
    expect(response.status()).toBe(403)
  })
})

test.describe('renter request', () => {
  test('prazna poruka ostaje na oglasu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await openContactListing(page)
    await page.getByTestId('contact-owner-button').click()
    await expect(page.getByTestId('contact-dialog')).toBeVisible()
    await page.getByTestId('request-submit').click()
    await expect(page.getByTestId('request-error')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(CONTACT_PATH))
  })

  test('zahtev bez datuma otvara thread bez iznosa', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await openContactListing(page)
    await page.getByTestId('contact-owner-button').click()
    await page.getByTestId('request-message').fill('Zdravo, da li je slobodno sledeće nedelje?')
    await page.getByTestId('request-submit').click()
    await page.waitForURL(/\/profile\/requests\/[0-9a-f-]{36}/)
    await expect(page.getByTestId('request-card')).toBeVisible()
    await expect(page.getByText('Datumi nisu izabrani.')).toBeVisible()
    await expect(page.getByTestId('message-thread')).not.toContainText('ukupno')
    await expect(page.getByTestId('message-thread')).not.toContainText('RSD')
    await expect(page.getByText('Zdravo, da li je slobodno sledeće nedelje?')).toBeVisible()
    await expect(page.getByTestId('text-message').getByTestId('message-time')).toBeVisible()
  })

  test('zahtev sa datumima pokazuje opseg, ne cenu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await openContactListing(page)
    await page.getByTestId('contact-owner-button').click()
    await page.getByTestId('request-message').fill('Može li u ovom terminu?')
    await page.getByTestId('request-add-dates').click()
    const days = page.locator('[data-testid^="date-"]:not([disabled])')
    await days.nth(0).click()
    await days.nth(2).click()
    await page.getByTestId('request-submit').click()
    await page.waitForURL(/\/profile\/requests\/[0-9a-f-]{36}/)
    await expect(page.getByTestId('request-card')).toBeVisible()
    await expect(page.getByText('Datumi nisu izabrani.')).toHaveCount(0)
    await expect(page.getByTestId('request-card')).not.toContainText('RSD')
    await expect(page.getByTestId('request-card')).not.toContainText('ukupno')
  })

  test('povratak na oglas i inbox drži isti razgovor', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await openContactListing(page)
    await page.getByTestId('contact-owner-button').click()
    await page.getByTestId('request-message').fill('Prva poruka.')
    await page.getByTestId('request-submit').click()
    await page.waitForURL(/\/profile\/requests\/[0-9a-f-]{36}/)
    const firstId = page.url().match(/\/profile\/requests\/([0-9a-f-]{36})/)?.[1]
    expect(firstId).toBeTruthy()

    await page.getByTestId('thread-back').click()
    await expect(page).toHaveURL(/\/profile\/requests\/?$/)
    await expect(page.getByTestId('conversation-row')).toHaveCount(1)

    await openContactListing(page)
    await expect(page.getByTestId('contact-owner-button')).toHaveCount(0)
    await page.getByTestId('open-conversation-button').click()
    await expect(page).toHaveURL(new RegExp(`/profile/requests/${firstId}`))
  })
})
