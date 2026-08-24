import { expect, test } from '@playwright/test'

import { IMAGE_PATHS } from '../fixtures/listing-data'

test.describe('edit profile', () => {
  test('ime i prezime stoje pored slike, prikazano ime ispod', async ({ page }) => {
    await page.goto('/profile/settings/edit')
    await expect(page.getByTestId('edit-profile-form')).toBeVisible()

    const avatar = page.getByTestId('avatar-upload')
    const firstName = page.locator('#first_name')
    const lastName = page.locator('#last_name')
    const displayName = page.locator('#display_name')

    await expect(avatar).toBeVisible()
    await expect(firstName).toBeVisible()
    await expect(lastName).toBeVisible()
    await expect(displayName).toBeVisible()

    const avatarBox = await avatar.boundingBox()
    const firstBox = await firstName.boundingBox()
    const lastBox = await lastName.boundingBox()
    const displayBox = await displayName.boundingBox()
    expect(avatarBox).toBeTruthy()
    expect(firstBox).toBeTruthy()
    expect(lastBox).toBeTruthy()
    expect(displayBox).toBeTruthy()
    if (!avatarBox || !firstBox || !lastBox || !displayBox) return

    expect(avatarBox.x).toBeLessThan(firstBox.x)
    expect(Math.abs(firstBox.y - lastBox.y)).toBeLessThan(8)
    expect(lastBox.x).toBeGreaterThan(firstBox.x)
    expect(displayBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 2)
    expect(displayBox.x).toBeGreaterThan(avatarBox.x + avatarBox.width / 2)
    expect(avatarBox.height).toBeGreaterThan(110)
    expect(avatarBox.height).toBeLessThan(140)
  })

  test('upload profilne slike', async ({ page }) => {
    await page.goto('/profile/settings/edit')
    await expect(page.getByTestId('edit-profile-form')).toBeVisible()

    await page.getByTestId('avatar-file-input').setInputFiles(IMAGE_PATHS.landscape)
    await expect(page.getByTestId('avatar-upload').locator('img')).toBeVisible()

    const upload = page.waitForResponse(
      (response) => response.url().includes('/profile/avatar') && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Sačuvaj promene' }).click()
    const response = await upload
    expect(response.ok()).toBe(true)
    const body = (await response.json()) as { data?: { avatar_url?: string } }
    expect(body.data?.avatar_url).toMatch(/^https?:\/\//)

    await expect(page).toHaveURL(/\/profile\/settings\/profile/)
    await expect(page.getByTestId('profile-avatar')).toBeVisible()
    await expect(page.getByTestId('header-account-avatar').locator('img')).toBeVisible()
  })
})
