import { expect, test } from '@playwright/test'

function listingFixture(index: number) {
  return {
    id: `home-listing-${index}`,
    slug: `predmet-${index}`,
    title: `Predmet ${index}`,
    thumbnail_url: null,
    price_1_day_minor: 80000,
    rating_avg: null,
    rating_count: 0,
    distance_m: null,
    municipality: 'Beograd',
    approx_latitude: 44.8,
    approx_longitude: 20.4,
    is_favorite: false,
    is_own: false,
    owner: { id: 'owner-1', display_name: 'Ana', is_verified: true },
  }
}

test.describe('homepage listings', () => {
  test('shows the twenty latest listings below the hero', async ({ page }) => {
    await page.route('**/api/v1/listings/search**', async (route) => {
      const listings = Array.from({ length: 20 }, (_, index) => listingFixture(index + 1))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: listings,
          meta: { page: 1, limit: 20, total: 20, total_pages: 1 },
        }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const hero = page.getByTestId('home-hero')
    if ((await hero.count()) === 0) {
      test.skip(true, 'Landing homepage does not render the app homepage')
    }

    await expect(hero).toBeVisible()
    await expect(page.getByTestId('home-listings-nearby')).toHaveCount(0)

    const latest = page.getByTestId('home-listings-latest')
    await expect(latest).toBeVisible()
    await expect(latest.getByRole('heading', { name: 'Najnovije' })).toBeVisible()

    const cards = latest.locator('article')
    await expect(cards).toHaveCount(20)

    const first = await cards.nth(0).boundingBox()
    const sixth = await cards.nth(5).boundingBox()
    expect(first && sixth).toBeTruthy()
    expect(Math.abs(first!.y - sixth!.y)).toBeLessThan(8)

    const heroBox = await hero.boundingBox()
    const latestBox = await latest.boundingBox()
    expect(heroBox && latestBox).toBeTruthy()
    expect(latestBox!.y).toBeGreaterThan(heroBox!.y + heroBox!.height - 1)
  })
})
