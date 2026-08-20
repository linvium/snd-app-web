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
})
