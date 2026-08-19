import { expect, test } from '@playwright/test'
import path from 'node:path'

import { CONTACT_LISTING } from '../fixtures/users'
import { cleanupRentalRequests } from '../helpers/cleanup-requests'

const CONTACT_PATH = `/listings/${CONTACT_LISTING.slug}`
const OWNER_STATE = path.join(process.cwd(), 'playwright/.auth/owner-booking.json')
const UNVERIFIED_STATE = path.join(process.cwd(), 'playwright/.auth/unverified.json')

test.beforeAll(async () => {
  await cleanupRentalRequests()
})

test.afterAll(async () => {
  await cleanupRentalRequests()
})

test.describe('messages', () => {
  test('prazan inbox', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await page.goto('/')
    await page.getByTestId('header-messages').click()
    await expect(page).toHaveURL(/\/profile\/requests\/?$/)
    await expect(page.getByRole('heading', { name: 'Zahtevi' })).toBeVisible()
    await expect(page.getByTestId('messages-empty')).toHaveText('Još nemaš zahteva.')
    await expect(
      page.getByRole('navigation', { name: 'Profil meni' }).getByRole('link', { name: 'Zahtevi' })
    ).toHaveAttribute('aria-current', 'page')

    await page.goto('/messages')
    await expect(page).toHaveURL(/\/profile\/requests\/?$/)
  })

  test('dok se inbox učitava vidi se skeleton, ne prazno stanje', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await page.route('**/api/v1/conversations**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { total: 0 } }),
      })
    })

    const going = page.goto('/profile/requests')
    await expect(page.getByTestId('messages-inbox-skeleton')).toBeVisible()
    await expect(page.getByTestId('messages-empty')).toHaveCount(0)
    await going
    await expect(page.getByTestId('messages-empty')).toBeVisible()
  })

  test('vlasnik vidi inbox, odgovara, renter vidi odgovor', async ({ page, browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await page.goto(CONTACT_PATH)
    await page.getByTestId('contact-owner-button').click()
    await page.getByTestId('request-message').fill('Zdravo, da li je slobodno?')
    await page.getByTestId('request-submit').click()
    await page.waitForURL(/\/profile\/requests\/[0-9a-f-]{36}/)
    const conversationId = page.url().match(/\/profile\/requests\/([0-9a-f-]{36})/)?.[1]
    expect(conversationId).toBeTruthy()

    const ownerContext = await browser.newContext({ storageState: OWNER_STATE })
    const ownerPage = await ownerContext.newPage()
    await ownerPage.goto(CONTACT_PATH)
    await expect(ownerPage.getByTestId('owner-listing-requests')).toBeVisible()
    await expect(ownerPage.getByTestId('messages-unread-badge').first()).toBeVisible({
      timeout: 20_000,
    })
    await ownerPage.goto('/profile/requests')
    await expect(ownerPage.getByTestId('conversation-row')).toHaveCount(1)
    await expect(ownerPage.getByTestId('conversation-unread')).toBeVisible()
    await ownerPage.getByTestId('conversation-row').click()
    await expect(ownerPage).toHaveURL(/\/profile\/requests\/[0-9a-f-]{36}/)
    await expect(
      ownerPage.getByRole('navigation', { name: 'Profil meni' }).getByRole('link', { name: 'Zahtevi' })
    ).toHaveAttribute('aria-current', 'page')
    await expect(ownerPage.getByTestId('request-card')).toBeVisible()
    await expect(ownerPage.getByTestId('thread-party-name')).toHaveText('E2E Iznajmljivač')
    await expect(ownerPage.getByText('Zdravo, da li je slobodno?')).toBeVisible()
    await expect(ownerPage.getByTestId('composer-hint')).toHaveText(
      'Enter šalje poruku. Shift + Enter novi red.'
    )
    const input = ownerPage.getByTestId('thread-message-input')
    await input.fill('Prvi red')
    await input.press('Shift+Enter')
    await expect(input).toHaveValue('Prvi red\n')
    await input.fill('Može, javi se u petak.')
    await Promise.all([
      ownerPage.waitForResponse(
        (res) => res.url().includes('/messages') && res.request().method() === 'POST' && res.ok()
      ),
      input.press('Enter'),
    ])
    await expect(
      ownerPage.getByTestId('text-message').filter({ hasText: 'Može, javi se u petak.' })
    ).toBeVisible()
    await ownerContext.close()

    await page.reload()
    await expect(page.getByTestId('text-message').filter({ hasText: 'Može, javi se u petak.' })).toBeVisible()
  })

  test('tuđi thread nije vidljiv', async ({ page, browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await cleanupRentalRequests()
    await page.goto(CONTACT_PATH)
    await page.getByTestId('contact-owner-button').click()
    await page.getByTestId('request-message').fill('Privatna poruka.')
    await page.getByTestId('request-submit').click()
    await page.waitForURL(/\/profile\/requests\/[0-9a-f-]{36}/)
    const conversationUrl = page.url()

    const stranger = await browser.newContext({ storageState: UNVERIFIED_STATE })
    const strangerPage = await stranger.newPage()
    await strangerPage.goto(conversationUrl)
    await expect(strangerPage.getByTestId('request-card')).toHaveCount(0)
    await expect(strangerPage.getByText('Privatna poruka.')).toHaveCount(0)
    await stranger.close()
  })
})
