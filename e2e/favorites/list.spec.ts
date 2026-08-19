import { expect, test } from '@playwright/test'

import { CONTACT_LISTING } from '../fixtures/users'

test.describe('favorites', () => {
  test('profil stranica omiljenih se otvara', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await page.goto('/profile/favorites')
    await expect(page.getByRole('heading', { name: 'Omiljeni' })).toBeVisible()
    await expect(page.getByTestId('favorites-empty').or(page.getByTestId('favorites-list'))).toBeVisible()

    await page.goto('/omiljeni')
    await expect(page).toHaveURL(/\/profile\/favorites\/?$/)
  })

  test('na telefonu donji meni ima omiljene umesto pretrage', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/profile/requests')
    const nav = page.getByRole('navigation', { name: 'Donja navigacija' })
    await expect(nav).toBeVisible()
    await expect(page.getByTestId('bottom-nav-favorites')).toBeVisible()
    await expect(nav.getByText('Omiljeni')).toBeVisible()
    await expect(nav.getByText('Pretraga')).toHaveCount(0)
  })

  test('dok se omiljeni učitavaju vidi se skeleton, ne prazno stanje', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await page.route('**/api/v1/favorites**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { total: 0 } }),
      })
    })

    const going = page.goto('/profile/favorites')
    await expect(page.getByTestId('favorites-skeleton')).toBeVisible()
    await expect(page.getByTestId('favorites-empty')).toHaveCount(0)
    await going
    await expect(page.getByTestId('favorites-empty')).toBeVisible()
  })

  test('srce na oglasu dodaje i skida omiljeni', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'verified', 'Koristi nalog iznajmljivača')
    await page.goto(`/listings/${CONTACT_LISTING.slug}`)
    await expect(page.getByRole('heading', { name: CONTACT_LISTING.title })).toBeVisible()

    const favorite = page.getByTestId('listing-favorite')
    await expect(favorite).toBeVisible()
    if ((await favorite.getAttribute('aria-pressed')) !== 'true') {
      await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes('favorites') && res.request().method() !== 'GET' && res.ok()
        ),
        favorite.click(),
      ])
    }
    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
    await expect
      .poll(async () => {
        const response = await page.request.get('/api/v1/favorites')
        const body = (await response.json()) as { data?: Array<{ slug: string }> }
        return (body.data ?? []).some((row) => row.slug === CONTACT_LISTING.slug)
      })
      .toBe(true)

    await page.goto('/profile/favorites')
    const card = page.getByTestId('favorites-list').locator('article').filter({
      hasText: CONTACT_LISTING.title,
    })
    await expect(card).toBeVisible()
    await card.getByTestId('listing-card-favorite').click()
    await expect(card).toHaveCount(0)
  })
})
