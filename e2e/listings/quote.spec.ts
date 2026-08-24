import { expect, test } from '@playwright/test'

import { datePresets } from '@/lib/calendar'

import { CONTACT_LISTING } from '../fixtures/users'

test.describe('listing quote loading', () => {
  test('slow quote shows a skeleton instead of popping the total in', async ({ page }) => {
    await page.route('**/api/v1/listings/**/quote', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800))
      await route.continue()
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/listings/${CONTACT_LISTING.slug}`)
    await expect(page.getByRole('heading', { name: CONTACT_LISTING.title })).toBeVisible()

    await page.getByRole('button', { name: /Preuzimanje/ }).click()
    await expect(page.getByRole('heading', { name: 'Izaberi period' })).toBeVisible()
    await page.getByTestId('date-preset-this-weekend').click()

    await expect(page.getByTestId('quote-skeleton')).toBeVisible()
    await expect(page.getByTestId('quote-skeleton')).toHaveCount(0)
    await expect(page.getByText('Ukupno').first()).toBeVisible()
  })

  test('dates in the URL show the total without a skeleton', async ({ page }) => {
    const weekend = datePresets().find((preset) => preset.id === 'this-weekend')
    expect(weekend).toBeTruthy()

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/listings/${CONTACT_LISTING.slug}?from=${weekend!.from}&to=${weekend!.to}`)
    await expect(page.getByRole('heading', { name: CONTACT_LISTING.title })).toBeVisible()
    await expect(page.getByTestId('quote-skeleton')).toHaveCount(0)
    await expect(page.getByText('Ukupno').first()).toBeVisible()
  })

  test('changing dates after a seeded quote fetches a new total', async ({ page }) => {
    const presets = datePresets()
    const weekend = presets.find((preset) => preset.id === 'this-weekend')
    const today = presets.find((preset) => preset.id === 'today')
    expect(weekend && today).toBeTruthy()

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/listings/${CONTACT_LISTING.slug}?from=${weekend!.from}&to=${weekend!.to}`)
    await expect(page.getByRole('heading', { name: CONTACT_LISTING.title })).toBeVisible()
    await expect(page.getByText('Ukupno').first()).toBeVisible()
    await expect(page.locator('aside').getByText('2 dana')).toBeVisible()

    await page.getByRole('button', { name: /Preuzimanje/ }).click()
    await expect(page.getByRole('heading', { name: 'Izaberi period' })).toBeVisible()
    await page.getByTestId('date-preset-today').click()
    await page.getByRole('button', { name: 'Potvrdi' }).click()

    await expect(page).toHaveURL(new RegExp(`from=${today!.from}&to=${today!.to}`))
    await expect(page.locator('aside').getByText('2 dana')).toHaveCount(0)
    await expect(page.locator('aside').getByText('1 dan')).toBeVisible()
    await expect(page.getByText('Ukupno').first()).toBeVisible()
  })
})
