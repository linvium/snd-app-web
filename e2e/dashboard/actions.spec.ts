import { expect, test } from '@playwright/test'

test.describe('dashboard action queue', () => {
  test('ne prikazuje dopunu profila kao akciju', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByTestId('manager-dashboard')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Čeka tvoju akciju' })).toBeVisible()

    const queue = page.getByTestId('action-queue')
    await expect(queue.getByText('Dodaj profilnu sliku')).toHaveCount(0)
    await expect(queue.getByText('Dodaj broj telefona')).toHaveCount(0)
    await expect(queue.getByText('Dodaj ime i prezime')).toHaveCount(0)
    await expect(queue.getByRole('link', { name: 'Dopuni' })).toHaveCount(0)
  })

  test('verifikacija ima dugme ispod teksta', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/profile')
    await expect(page.getByTestId('manager-dashboard')).toBeVisible()

    const box = page.getByTestId('verification-box').locator('visible=true')
    await expect(box).toHaveAttribute('data-state', 'unverified')

    const icon = box.locator('svg').first()
    const title = box.getByText('Identitet nije potvrđen')
    const cta = box.getByRole('link', { name: 'Potvrdi identitet' })

    const iconBox = await icon.boundingBox()
    const titleBox = await title.boundingBox()
    const ctaBox = await cta.boundingBox()
    expect(iconBox).toBeTruthy()
    expect(titleBox).toBeTruthy()
    expect(ctaBox).toBeTruthy()
    if (!iconBox || !titleBox || !ctaBox) return

    expect(iconBox.x).toBeLessThan(titleBox.x)
    expect(Math.abs(iconBox.y - titleBox.y)).toBeLessThan(12)
    expect(ctaBox.y).toBeGreaterThan(titleBox.y + titleBox.height)
  })
})
