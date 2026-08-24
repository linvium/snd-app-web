import { expect, test } from '@playwright/test'

test.describe('email verification gate', () => {
  test('neverifikovan email vidi gate, ne formu', async ({ page }) => {
    await page.goto('/profile/listings/new')
    await expect(page.getByTestId('email-gate')).toBeVisible()
    await expect(page.getByText('Moraš potvrditi email adresu pre objave.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pošalji ponovo' })).toBeVisible()
    await expect(page.getByTestId('publish-form')).toHaveCount(0)
    await expect(page.getByTestId('step-1-section')).toHaveCount(0)
  })

  test('na telefonu back vraća sa email gate', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/profile/listings/new')
    await expect(page.getByTestId('email-gate')).toBeVisible()
    const back = page.getByTestId('mobile-back')
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/profile\/?$/)
  })
})
