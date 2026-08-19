import { expect, test } from '@playwright/test'

const MONTHS_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
  'jul', 'avg', 'sep', 'okt', 'nov', 'dec',
]

function todayCompactLabel(now = new Date()) {
  return `${now.getDate()}. ${MONTHS_SHORT[now.getMonth()]}`
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
})
