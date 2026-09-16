import { expect, test } from '@playwright/test'

test.describe('billing overview', () => {
  test('shows the plan, the credits and the packs to buy', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/profile/billing')

    await expect(page.getByTestId('billing-overview')).toBeVisible()
    await expect(page.getByTestId('billing-subscription')).toBeVisible()
    await expect(page.getByTestId('billing-credit-balance')).toBeVisible()
    await expect(page.getByTestId('plan-card')).toHaveCount(3)
    await expect(page.getByTestId('credit-pack-card')).toHaveCount(4)

    await expect(
      page.getByRole('navigation', { name: 'Profil meni' }).getByRole('link', { name: 'Pretplata' })
    ).toHaveAttribute('aria-current', 'page')
  })

  test('an owner on a plan cannot start a second one', async ({ page }) => {
    await page.goto('/profile/billing')
    const subscription = page.getByTestId('billing-subscription')
    await expect(subscription).toBeVisible()

    // The seeded test user is on Pro; the other plans offer no checkout.
    if ((await subscription.getAttribute('data-state')) === 'none') {
      test.skip(true, 'Seed test users first: npm run test:e2e:seed')
    }
    await expect(page.getByTestId('plan-current')).toHaveCount(1)
    for (const button of await page.getByTestId('plan-buy').all()) {
      await expect(button).toBeDisabled()
    }
  })
})
