import { expect, type Page } from '@playwright/test'

import { IMAGE_PATHS, VALID_LISTING } from '../fixtures/listing-data'

export function visible(page: Page, testId: string) {
  return page.getByTestId(testId).locator('visible=true').first()
}

export async function openNewListing(page: Page) {
  await page.goto('/listings/new')
  const banner = page.getByTestId('draft-resume-banner')
  await Promise.race([
    page.waitForURL(/\/listings\/new\/[0-9a-f-]{36}/i, { timeout: 20_000 }),
    banner.waitFor({ state: 'visible', timeout: 20_000 }),
  ])
  if (await banner.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Počni novi' }).click()
    await page.waitForURL(/\/listings\/new\/[0-9a-f-]{36}/i)
  }
  await expect(visible(page, 'publish-form')).toBeVisible()
}

export async function fillDescribe(
  page: Page,
  data: { title?: string; description?: string } = {}
) {
  await page.locator('#listing-title').fill(data.title ?? VALID_LISTING.title)
  await page.locator('#listing-description').fill(data.description ?? VALID_LISTING.description)
}

export async function uploadPhotos(page: Page, files: string[]) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/images') && res.request().method() === 'POST' && res.ok()
    ),
    page.getByTestId('photo-file-input').setInputFiles(files),
  ])
  return response
}

export async function waitForCoverPhoto(page: Page) {
  await expect(visible(page, 'photo-slot-0').getByText('Naslovna')).toBeVisible()
}

export async function pickFirstLeafCategory(page: Page) {
  await visible(page, 'category-picker').click()
  for (let depth = 0; depth < 6; depth += 1) {
    const option = page.getByTestId('category-option').first()
    await expect(option).toBeVisible()
    const isLeaf = (await option.getAttribute('data-leaf')) === 'true'
    await option.click()
    if (isLeaf) break
  }
  await expect(visible(page, 'category-picker')).not.toContainText('Izaberi kategoriju')
}

export async function fillPrices(
  page: Page,
  data: { price1Day?: string; price3Days?: string; price7Days?: string } = {}
) {
  await page.locator('#price-1').fill(data.price1Day ?? VALID_LISTING.price1Day)
  if (data.price3Days !== undefined || VALID_LISTING.price3Days) {
    await page.locator('#price-3').fill(data.price3Days ?? VALID_LISTING.price3Days)
  }
  if (data.price7Days !== undefined || VALID_LISTING.price7Days) {
    await page.locator('#price-7').fill(data.price7Days ?? VALID_LISTING.price7Days)
  }
}

export async function pickFirstLocation(page: Page) {
  const option = page.getByTestId('location-option').first()
  await expect(option).toBeVisible({ timeout: 15_000 })
  await option.click()
}

export async function fillItemValue(page: Page, value = VALID_LISTING.itemValue) {
  await page.locator('#item-value').fill(value)
}

export async function fillRequiredSteps(page: Page) {
  await fillDescribe(page)
  await uploadPhotos(page, [IMAGE_PATHS.landscape])
  await waitForCoverPhoto(page)
  await pickFirstLeafCategory(page)
  await fillPrices(page)
  await pickFirstLocation(page)
  await fillItemValue(page)
}

export async function publishListing(page: Page) {
  const button = visible(page, 'publish-button')
  await Promise.all([
    page.waitForURL(/\/profile\/listings/),
    button.click(),
  ])
}

export async function waitForAutosave(page: Page) {
  const indicator = visible(page, 'autosave-indicator')
  await expect(indicator).toHaveText(/Snimam|Sačuvano/)
  await expect(indicator).toHaveText(/Sačuvano/, { timeout: 10_000 })
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByLabel('Notifications alt+T').getByText(text).first()).toBeVisible()
}

export async function moveSecondPhotoToCover(page: Page) {
  const source = visible(page, 'photo-slot-1')
  const target = visible(page, 'photo-slot-0')
  await source.scrollIntoViewIfNeeded()

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/images/order') && res.request().method() === 'PATCH'
  )

  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()
  if (!sourceBox || !targetBox) throw new Error('Photo slots are not visible')

  const startX = sourceBox.x + 16
  const startY = sourceBox.y + sourceBox.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 24, startY, { steps: 8 })
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 30,
  })
  await page.mouse.up()

  const response = await responsePromise
  if (!response.ok()) {
    throw new Error(`Image reorder failed: ${response.status()}`)
  }
}
