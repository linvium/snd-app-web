import { expect, test, type Page } from '@playwright/test'

import { HEADER_SEARCH_MAX_WIDTH_PX } from '../../lib/layout/header.helpers'

async function boxesOverlapVertically(
  page: Page,
  firstTestId: string,
  secondSelector: { testId?: string; role?: Parameters<Page['getByRole']>[0]; name?: string }
) {
  const first = page.getByTestId(firstTestId)
  const second = secondSelector.testId
    ? page.getByTestId(secondSelector.testId)
    : page.getByRole(secondSelector.role!, { name: secondSelector.name })

  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  expect(firstBox).toBeTruthy()
  expect(secondBox).toBeTruthy()
  if (!firstBox || !secondBox) return false

  return firstBox.y < secondBox.y + secondBox.height && firstBox.y + firstBox.height > secondBox.y
}

test.describe('header layout', () => {
  test('desktop search page keeps utility links and search on the main row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/search')

    const utility = page.getByTestId('header-utility-nav')
    await expect(utility).toBeVisible()
    await expect(utility.getByRole('link', { name: 'Kako funkcioniše' })).toBeVisible()
    await expect(utility.getByRole('link', { name: 'Garancija' })).toBeVisible()
    await expect(utility.getByRole('link', { name: 'Česta pitanja' })).toBeVisible()
    await expect(utility.getByRole('link', { name: 'Kontakt' })).toBeVisible()

    await expect(page.getByTestId('header-search')).toBeVisible()
    await expect(utility).toHaveCSS('border-bottom-width', '0px')
    expect(
      await boxesOverlapVertically(page, 'header-search', {
        role: 'link',
        name: 'SND početna',
      })
    ).toBe(true)
  })

  test('homepage header spans the viewport when the app shell is shown', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const main = page.getByTestId('header-main')
    if ((await main.count()) === 0) {
      test.skip(true, 'Landing homepage does not render the app header')
    }

    const mainBox = await main.boundingBox()
    const utilityBox = await page.getByTestId('header-utility-nav').boundingBox()
    expect(mainBox).toBeTruthy()
    expect(utilityBox).toBeTruthy()
    expect(mainBox!.width).toBeGreaterThan(1200)
    expect(utilityBox!.width).toBeGreaterThan(1200)
    await expect(page.getByTestId('header-utility-nav')).toHaveCSS('border-bottom-width', '0px')

    const hero = page.getByTestId('home-hero')
    await expect(hero).toBeVisible()
    await expect(hero.locator('img')).toHaveAttribute('src', /homepage_hero/)
    const heroBox = await hero.boundingBox()
    expect(heroBox).toBeTruthy()
    expect(heroBox!.y).toBeLessThanOrEqual(1)
    expect(heroBox!.height).toBeLessThan(720)
    expect(mainBox!.y).toBeGreaterThanOrEqual(heroBox!.y)
    expect(mainBox!.y).toBeLessThan(heroBox!.y + heroBox!.height)

    await expect(page.getByRole('link', { name: 'SND početna' }).locator('img')).toHaveAttribute(
      'src',
      /snd_logo_horizontal/
    )
  })

  test('utility bar scrolls away while the logo row stays sticky', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    if ((await page.getByTestId('header-main').count()) === 0) {
      test.skip(true, 'Landing homepage does not render the app header')
    }

    const utility = page.getByTestId('header-utility-nav')
    const main = page.getByTestId('header-main')
    await expect(utility).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, 400))

    await expect.poll(async () => {
      const utilityBox = await utility.boundingBox()
      const mainBox = await main.boundingBox()
      if (!utilityBox || !mainBox) return false
      return utilityBox.y + utilityBox.height <= 1 && mainBox.y <= 1
    }).toBe(true)
  })

  test('homepage header uses a frosted white surface after scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    if ((await page.getByTestId('header-main').count()) === 0) {
      test.skip(true, 'Landing homepage does not render the app header')
    }

    const header = page.getByRole('banner')
    await expect.poll(async () => header.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(
      /transparent|rgba\(0,\s*0,\s*0,\s*0\)/
    )

    await page.evaluate(() => window.scrollTo(0, 400))

    await expect.poll(async () => {
      return header.evaluate((el) => {
        const style = getComputedStyle(el)
        return {
          color: style.backgroundColor,
          blur: style.backdropFilter,
        }
      })
    }).toMatchObject({
      color: expect.stringMatching(/0\.8|\/\s*0\.8/),
      blur: expect.stringMatching(/blur\(/),
    })
  })

  test('collapsed search submit centres the icon in the circle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/search')

    const button = page.getByTestId('header-search').getByRole('button', { name: 'Pretraži' })
    await expect(button).toBeVisible()

    const icon = button.locator('svg')
    const buttonBox = await button.boundingBox()
    const iconBox = await icon.boundingBox()
    expect(buttonBox).toBeTruthy()
    expect(iconBox).toBeTruthy()

    const buttonCenterX = buttonBox!.x + buttonBox!.width / 2
    const buttonCenterY = buttonBox!.y + buttonBox!.height / 2
    const iconCenterX = iconBox!.x + iconBox!.width / 2
    const iconCenterY = iconBox!.y + iconBox!.height / 2

    expect(buttonBox!.width).toBeCloseTo(buttonBox!.height, 0)
    expect(Math.abs(buttonCenterX - iconCenterX)).toBeLessThan(2)
    expect(Math.abs(buttonCenterY - iconCenterY)).toBeLessThan(2)
  })

  test('focusing a search field does not shrink or cover the others', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/search')

    const search = page.getByTestId('header-search')
    const q = search.getByTestId('search-segment-q')
    const city = search.getByTestId('search-segment-city')
    const dates = search.getByTestId('search-segment-dates')
    const submit = search.getByRole('button', { name: 'Pretraži' })

    const before = {
      q: await q.boundingBox(),
      city: await city.boundingBox(),
      dates: await dates.boundingBox(),
      submit: await submit.boundingBox(),
    }
    expect(before.q && before.city && before.dates && before.submit).toBeTruthy()

    await city.click()
    await expect(submit).toContainText('Pretraži')

    await expect(async () => {
      const after = {
        q: await q.boundingBox(),
        city: await city.boundingBox(),
        dates: await dates.boundingBox(),
        submit: await submit.boundingBox(),
      }
      expect(after.q && after.city && after.dates && after.submit).toBeTruthy()

      expect(Math.abs(after.q!.width - before.q!.width)).toBeLessThan(4)
      expect(Math.abs(after.city!.width - before.city!.width)).toBeLessThan(4)
      expect(Math.abs(after.dates!.width - before.dates!.width)).toBeLessThan(4)
      expect(after.submit!.width).toBeGreaterThan(before.submit!.width)

      expect(after.submit!.x).toBeGreaterThanOrEqual(after.dates!.x)
      expect(after.submit!.x + after.submit!.width).toBeLessThanOrEqual(after.dates!.x + after.dates!.width + 1)

      const pill = await search.getByTestId('search-focus-pill').boundingBox()
      const datesLabel = await dates.getByText('Datumi', { exact: true }).boundingBox()
      const queryField = await search.getByPlaceholder('Pretraži predmete').boundingBox()
      expect(pill && datesLabel && queryField).toBeTruthy()
      expect(pill!.x + pill!.width).toBeLessThanOrEqual(datesLabel!.x)
      expect(queryField!.x + queryField!.width).toBeLessThanOrEqual(pill!.x + 1)
    }).toPass({ timeout: 4_000 })
  })

  test('desktop search bar is centered and capped instead of filling the row', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    for (const path of ['/search', '/faq']) {
      await page.goto(path)
      const main = await page.getByTestId('header-main').boundingBox()
      const search = await page.getByTestId('header-search').boundingBox()
      expect(main).toBeTruthy()
      expect(search).toBeTruthy()
      expect(search!.width).toBeLessThanOrEqual(HEADER_SEARCH_MAX_WIDTH_PX + 1)
      expect(search!.width).toBeLessThan(main!.width * 0.7)
      const mainCenter = main!.x + main!.width / 2
      const searchCenter = search!.x + search!.width / 2
      expect(Math.abs(mainCenter - searchCenter)).toBeLessThan(12)
    }
  })

  test('mobile search page hides the utility bar and stacks search under the logo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/search')

    await expect(page.getByTestId('header-utility-nav')).toBeHidden()
    await expect(page.getByTestId('header-search')).toBeVisible()
    expect(
      await boxesOverlapVertically(page, 'header-search', {
        role: 'link',
        name: 'SND početna',
      })
    ).toBe(false)
  })

  test('utility pages render', async ({ page }) => {
    await page.goto('/kako-funkcionise')
    await expect(page.getByRole('heading', { name: 'Kako funkcioniše' })).toBeVisible()

    await page.goto('/faq')
    await expect(page.getByRole('heading', { name: 'Česta pitanja' })).toBeVisible()

    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: 'Kontakt' })).toBeVisible()
  })
})
