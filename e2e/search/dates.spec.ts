import { expect, test } from '@playwright/test'

import { CONTACT_LISTING } from '../fixtures/users'

const MONTHS_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
  'jul', 'avg', 'sep', 'okt', 'nov', 'dec',
]

function todayIso(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10)
}

function todayCompactLabel(now = new Date()) {
  return `${now.getDate()}. ${MONTHS_SHORT[now.getMonth()]}`
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getUTCFullYear()}.`
}

function searchListing() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: CONTACT_LISTING.slug,
    title: CONTACT_LISTING.title,
    thumbnail_url: null,
    price_1_day_minor: 80000,
    rating_avg: null,
    rating_count: 0,
    distance_m: 1200,
    municipality: 'Beograd',
    approx_latitude: 44.81,
    approx_longitude: 20.46,
    is_favorite: false,
    is_own: false,
    owner: { id: 'owner-1', display_name: 'Ana', is_verified: true },
  }
}

test.describe('search date picker', () => {
  test('Danas fills the header date field', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/search')

    const datesField = page.getByRole('button', { name: /^Datumi/ })
    await datesField.click()
    await page.getByTestId('date-preset-today').click()

    await expect(datesField).toContainText(todayCompactLabel())
    await expect(datesField).not.toContainText('Dodaj datume')
  })

  test('search dates apply to Preuzimanje and Vraćanje on the listing', async ({ page }) => {
    const listing = searchListing()
    const from = todayIso()
    const formatted = formatDate(from)

    await page.route('**/api/v1/listings/search/pins**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: listing.id,
              slug: listing.slug,
              title: listing.title,
              price_1_day_minor: listing.price_1_day_minor,
              approx_latitude: listing.approx_latitude,
              approx_longitude: listing.approx_longitude,
              city: listing.municipality,
            },
          ],
          meta: { total: 1, truncated: false },
        }),
      })
    })

    await page.route('**/api/v1/listings/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [listing],
          meta: {
            page: 1,
            limit: 10,
            total: 1,
            total_pages: 1,
            search_center: { lat: null, lng: null, source: 'none' },
            applied_filters: {},
          },
        }),
      })
    })

    await page.route('**/api/v1/categories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/search')

    const datesField = page.getByRole('button', { name: /^Datumi/ })
    await datesField.click()
    await page.getByTestId('date-preset-today').click()
    await page.getByRole('button', { name: 'Pretraži' }).click()

    await expect(page).toHaveURL(new RegExp(`from=${from}`))
    await expect(page).toHaveURL(new RegExp(`to=${from}`))

    const card = page.getByTestId('listing-card')
    await expect(card).toBeVisible()
    await expect(card.getByRole('link').first()).toHaveAttribute(
      'href',
      `/listings/${CONTACT_LISTING.slug}?from=${from}&to=${from}`
    )

    await card.getByRole('heading', { name: CONTACT_LISTING.title }).click()
    await expect(page).toHaveURL(
      new RegExp(`/listings/${CONTACT_LISTING.slug}\\?from=${from}&to=${from}`)
    )
    await expect(page.getByRole('heading', { name: CONTACT_LISTING.title })).toBeVisible()

    const pickupReturn = page.getByRole('button', { name: /Preuzimanje/ })
    await expect(pickupReturn).toContainText(formatted)
    await expect(pickupReturn).not.toContainText('Izaberi')
    await expect(page.getByText('Ukupno').first()).toBeVisible()
  })

  test('Možda te zanima does not carry search dates', async ({ page }) => {
    const suggestion = searchListing()

    await page.route('**/api/v1/listings/search/pins**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { total: 0, truncated: false } }),
      })
    })

    await page.route('**/api/v1/listings/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          meta: {
            page: 1,
            limit: 10,
            total: 0,
            total_pages: 0,
            search_center: { lat: null, lng: null, source: 'none' },
            applied_filters: {},
          },
        }),
      })
    })

    await page.route('**/api/v1/listings/recent**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [suggestion],
          meta: { page: 1, limit: 4, total: 1, total_pages: 1 },
        }),
      })
    })

    await page.route('**/api/v1/categories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/search')

    const datesField = page.getByRole('button', { name: /^Datumi/ })
    await datesField.click()
    await page.getByTestId('date-preset-today').click()
    await page.getByRole('button', { name: 'Pretraži' }).click()

    await expect(page.getByRole('heading', { name: 'Ništa nije slobodno tih dana' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Možda te zanima' })).toBeVisible()

    const card = page.getByTestId('listing-card')
    await expect(card).toBeVisible()
    await expect(card.getByRole('link').first()).toHaveAttribute(
      'href',
      `/listings/${CONTACT_LISTING.slug}`
    )
  })
})
