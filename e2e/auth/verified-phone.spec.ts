import { expect, test } from '@playwright/test'

// Runs as the seeded verified user. To look like someone who signed up with a
// phone, the real `users` row is fetched and given a verified phone on the way
// to the page, so nothing in the database changes.
test.describe('account phone verified at sign-up', () => {
  test('profile edit shows the verified phone read-only', async ({ page }) => {
    await page.route(/\/rest\/v1\/users\?/, async (route) => {
      const response = await route.fetch()
      const row = await response.json()
      await route.fulfill({
        response,
        json: { ...row, phone: '387603603835', phone_verified_at: new Date().toISOString() },
      })
    })

    await page.goto('/profile/settings/edit')

    const phone = page.locator('#phone')
    await expect(phone).toHaveValue('+387603603835')
    await expect(phone).toBeDisabled()
    await expect(page.getByText('ne može se menjati')).toBeVisible()
  })
})
