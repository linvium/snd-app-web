import { expect, test } from '@playwright/test'

test.describe('pricing page', () => {
  test('lists three plans and credit packs that get cheaper per credit', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByRole('heading', { name: 'Pretplata i krediti', level: 1 })).toBeVisible()

    await expect(page.getByTestId('plan-card')).toHaveCount(3)
    for (const card of await page.getByTestId('plan-card').all()) {
      await expect(card).toContainText('objavljenih u isto vreme')
    }

    const packs = page.getByTestId('credit-pack-card')
    await expect(packs).toHaveCount(4)
    const unitPrices = await packs.evaluateAll((cards) =>
      cards.map((card) => Number(card.getAttribute('data-unit-price-minor')))
    )
    for (let index = 1; index < unitPrices.length; index += 1) {
      expect(unitPrices[index]).toBeLessThan(unitPrices[index - 1])
    }
  })

  test('says nothing about a guarantee or a fee on renting', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByTestId('pricing-plans')).toBeVisible()
    await expect(page.getByText(/garancij/i)).toHaveCount(0)
    await expect(page.getByText(/naknad/i)).toHaveCount(0)
  })

  test('sends a guest to sign in before buying', async ({ page }) => {
    await page.goto('/pricing')
    await page.getByTestId('credit-pack-card').last().getByRole('link', { name: 'Kupi' }).click()
    await expect(page).toHaveURL(/\/auth\/login\?next=%2Fpricing/)
  })
})
