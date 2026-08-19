import { expect, type Page } from '@playwright/test'

import { IMAGE_PATHS, VALID_LISTING } from '../fixtures/listing-data'
import { listingIdFromUrl } from './cleanup'

export function visible(page: Page, testId: string) {
  return page.getByTestId(testId).locator('visible=true').first()
}

export async function openNewListing(page: Page) {
  await page.goto('/profile/listings/new')
  await expect(visible(page, 'publish-form')).toBeVisible()
  await expect(page.getByTestId('draft-resume-banner')).toHaveCount(0)
  await expect(page).toHaveURL(/\/profile\/listings\/new$/)
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
  const picker = visible(page, 'category-picker')
  await expect(picker).toBeEnabled({ timeout: 15_000 })
  await picker.click()
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

export async function fillRequiredSteps(page: Page, options: { itemValue?: boolean } = {}) {
  await fillDescribe(page)
  await uploadPhotos(page, [IMAGE_PATHS.landscape])
  await waitForCoverPhoto(page)
  await pickFirstLeafCategory(page)
  await fillPrices(page)
  await pickFirstLocation(page)
  if (options.itemValue !== false) {
    await fillItemValue(page)
  }
}

export async function confirmPublish(page: Page) {
  await expect(page.getByTestId('publish-confirm-button')).toBeVisible()
  await page.getByTestId('publish-confirm-button').click()
}

export async function publishListing(page: Page) {
  await visible(page, 'publish-button').click()
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/profile/listings'),
    confirmPublish(page),
  ])
}

export async function saveAsDraft(page: Page) {
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/profile/listings'),
    visible(page, 'save-draft-button').click(),
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

export async function confirmStatusChange(page: Page) {
  const confirm = page.getByTestId('status-confirm-button')
  await expect(confirm).toBeVisible()
  await confirm.click()
}

export async function mockGeocode(page: Page) {
  await page.route('**/api/v1/geo/geocode**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            label: 'Knez Mihailova 1, Beograd',
            street: 'Knez Mihailova 1',
            city: 'Beograd',
            postal_code: '11000',
            latitude: 44.8176,
            longitude: 20.4633,
          },
        ],
        meta: { total: 1 },
      }),
    })
  })
}

export async function openAddLocation(page: Page) {
  const addButton = page.getByRole('button', { name: /Dodaj (lokaciju|prvu lokaciju)/ }).first()
  await addButton.click()
  await expect(page.getByRole('heading', { name: 'Dodaj lokaciju' })).toBeVisible()
}

export function trackIdFromUpload(responseUrl: string, ids: Set<string>) {
  const id = listingIdFromUrl(responseUrl)
  if (id) ids.add(id)
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
