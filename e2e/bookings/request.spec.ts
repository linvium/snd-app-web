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
    await openContactListing(page)
    const editHref = await page.getByRole('link', { name: 'Izmeni oglas' }).getAttribute('href')
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
  test('levo nema dupli kontakt CTA', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await openContactListing(page)
    await expect(page.getByRole('button', { name: 'Kontaktiraj vlasnika' })).toHaveCount(0)
    await expect(page.getByTestId('contact-owner-button')).toBeVisible()
    await expect(page.getByTestId('send-message-button')).toBeVisible()
  })

  test('na telefonu back vraća sa detalja oglasa', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/profile/requests')
    await page.goto(CONTACT_PATH)
    await expect(page.getByRole('heading', { name: CONTACT_LISTING.title })).toBeVisible()
    const back = page.getByTestId('mobile-back')
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/profile\/requests\/?$/)
  })

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

  test('datumi sa oglasa idu u zahtev', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await page.goto(`${CONTACT_PATH}?from=2026-08-22&to=2026-08-24`)
    await expect(page.getByRole('heading', { name: CONTACT_LISTING.title })).toBeVisible()
    await page.getByTestId('contact-owner-button').click()
    await expect(page.getByTestId('contact-dialog')).toBeVisible()
    await expect(page.getByTestId('contact-dialog').getByTestId('date-preset-today')).toBeVisible()
    await page.getByTestId('request-message').fill('Već sam izabrao datume.')
    await page.getByTestId('request-submit').click()
    await page.waitForURL(/\/profile\/requests\/[0-9a-f-]{36}/)
    await expect(page.getByTestId('request-card')).toBeVisible()
    await expect(page.getByText('Datumi nisu izabrani.')).toHaveCount(0)
  })

  test('pošalji poruku otvara isti dijalog', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await openContactListing(page)
    await page.getByTestId('send-message-button').click()
    await expect(page.getByTestId('contact-dialog')).toBeVisible()
    await page.getByTestId('request-message').fill('Samo poruka, isti tok.')
    await page.getByTestId('request-submit').click()
    await page.waitForURL(/\/profile\/requests\/[0-9a-f-]{36}/)
    await expect(page.getByTestId('request-card')).toBeVisible()
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

    await page.goto('/profile/requests')
    await expect(page).toHaveURL(/\/profile\/requests\/?$/)
    await expect(page.getByTestId('conversation-row')).toHaveCount(1)

    await page.route('**/api/v1/conversations**', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
      await route.continue()
    })

    await openContactListing(page)
    await expect(page.getByTestId('contact-owner-button')).toHaveCount(0)
    await expect(page.getByTestId('send-message-button')).toHaveCount(0)
    await expect(page.getByTestId('open-conversation-button')).toBeVisible()
    await page.getByTestId('open-conversation-button').click()
    await expect(page).toHaveURL(new RegExp(`/profile/requests/${firstId}`))
  })
})
