import { expect, test } from '@playwright/test'

import { FOOTER_COMPANY_LINKS, FOOTER_LEGAL_LINKS } from '../../lib/layout/footer.helpers'

test.describe('footer', () => {
  test('stands under the public pages with both link columns', async ({ page }) => {
    await page.goto('/support/faq')

    const footer = page.getByRole('contentinfo')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: 'SND početna' })).toBeVisible()

    for (const link of [...FOOTER_COMPANY_LINKS, ...FOOTER_LEGAL_LINKS]) {
      await expect(footer.getByRole('link', { name: link.label, exact: true })).toHaveAttribute(
        'href',
        link.href
      )
    }
  })

  test('social profiles open in a new tab', async ({ page }) => {
    await page.goto('/support/faq')

    for (const key of ['instagram', 'facebook']) {
      const social = page.getByTestId(`footer-social-${key}`)
      await expect(social).toHaveAttribute('target', '_blank')
      await expect(social).toHaveAttribute('rel', /noopener/)
      expect(await social.getAttribute('href')).toMatch(/^https:\/\//)
    }
  })

  test('a footer link opens the support sheet without leaving the page', async ({ page }) => {
    // From a page that is not the one being linked to - on /support itself the
    // link is plain navigation.
    await page.goto('/categories')
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Garancija', exact: true })
      .click()

    const sheet = page.getByTestId('support-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('heading', { name: 'Garancija', level: 1 })).toBeVisible()
    await expect(page).toHaveURL(/\/categories/)
  })

  test('stays off the search page, where the map owns the viewport', async ({ page }) => {
    await page.goto('/search')
    await expect(page.getByRole('contentinfo')).toHaveCount(0)
  })
})
