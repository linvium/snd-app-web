import { expect, test } from '@playwright/test'

function listingFixture(index: number) {
  return {
    id: `search-listing-${index}`,
    slug: `predmet-${index}`,
    title: `Predmet ${index}`,
    thumbnail_url: null,
    price_1_day_minor: 80000 + index * 1000,
    rating_avg: null,
    rating_count: 0,
    distance_m: 1200,
    municipality: 'Beograd',
    approx_latitude: 44.81 + index * 0.002,
    approx_longitude: 20.46 + index * 0.002,
    is_favorite: false,
    is_own: false,
    owner: { id: 'owner-1', display_name: 'Ana', is_verified: true },
  }
}

test.describe('search layout', () => {
  test('desktop split is even, with four compact cards in the first row', async ({ page }) => {
    const listings = Array.from({ length: 10 }, (_, index) => listingFixture(index + 1))

    await page.route('**/api/v1/listings/search/pins**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: listings.map((listing) => ({
            id: listing.id,
            slug: listing.slug,
            title: listing.title,
            price_1_day_minor: listing.price_1_day_minor,
            approx_latitude: listing.approx_latitude,
            approx_longitude: listing.approx_longitude,
            city: listing.municipality,
          })),
          meta: { total: listings.length, truncated: false },
        }),
      })
    })

    await page.route('**/api/v1/listings/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: listings,
          meta: {
            page: 1,
            limit: 10,
            total: listings.length,
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

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/search')

    const list = page.getByTestId('search-list-panel')
    const map = page.getByTestId('search-map-aside')
    await expect(list).toBeVisible()
    await expect(map).toBeVisible()

    const listBox = await list.boundingBox()
    const mapBox = await map.boundingBox()
    expect(listBox && mapBox).toBeTruthy()

    const totalWidth = listBox!.width + mapBox!.width
    expect(listBox!.width / totalWidth).toBeCloseTo(0.5, 1)
    expect(mapBox!.width / totalWidth).toBeCloseTo(0.5, 1)

    const cards = page.getByTestId('search-results').locator('article')
    await expect(cards).toHaveCount(10)

    const first = await cards.nth(0).boundingBox()
    const fourth = await cards.nth(3).boundingBox()
    const fifth = await cards.nth(4).boundingBox()
    expect(first && fourth && fifth).toBeTruthy()
    expect(Math.abs(first!.y - fourth!.y)).toBeLessThan(8)
    expect(fifth!.y).toBeGreaterThan(first!.y + 40)
  })
})
