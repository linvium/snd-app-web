import { expect, test } from '@playwright/test'

test.describe('register page legal links', () => {
  test('terms and privacy point at the legal pages and open in a new tab', async ({ page }) => {
    await page.goto('/auth/register')

    for (const [name, href] of [
      ['Uslove korišćenja', '/legal/terms'],
      ['Politiku privatnosti', '/legal/privacy'],
    ] as const) {
      const link = page.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('href', href)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
    }
  })

  test('clicking a link opens the document and keeps the form', async ({ page, context }) => {
    await page.goto('/auth/register')
    await page.getByLabel('Email').fill('keep-me@example.com')

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'Uslove korišćenja', exact: true }).click(),
    ])
    await popup.waitForLoadState()

    expect(new URL(popup.url()).pathname).toBe('/legal/terms')
    await expect(page).toHaveURL(/\/auth\/register/)
    await expect(page.getByLabel('Email')).toHaveValue('keep-me@example.com')
  })
})
