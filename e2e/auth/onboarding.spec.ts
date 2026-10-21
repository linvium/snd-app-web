import { expect, test, type Page } from '@playwright/test'

// Runs as the seeded verified user. Writes are answered here so the account's
// real profile and locations are left alone.
async function stubWrites(page: Page) {
  const saved = { profile: [] as unknown[], locations: [] as Record<string, unknown>[] }

  await page.route(/\/rest\/v1\/user_profiles\?/, async (route) => {
    const request = route.request()
    if (request.method() !== 'PATCH') return route.continue()
    saved.profile.push(request.postDataJSON())
    return route.fulfill({ status: 204 })
  })

  await page.route(/\/rest\/v1\/locations\?/, async (route) => {
    const request = route.request()
    if (request.method() === 'PATCH') return route.fulfill({ status: 204 })
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>
      saved.locations.push(body)
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: '22222222-2222-4222-8222-222222222222', ...body }),
      })
    }
    return route.continue()
  })

  return saved
}

async function stubGeocode(page: Page) {
  await page.route('**/api/v1/geo/geocode*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            label: 'Knez Mihailova 1, Beograd',
            street: 'Knez Mihailova 1',
            city: 'Beograd',
            postal_code: '11000',
            latitude: 44.8186,
            longitude: 20.4572,
          },
        ],
      }),
    })
  )
}

async function fillNames(page: Page, first: string, last: string) {
  await page.getByLabel('Ime', { exact: true }).fill(first)
  await page.getByLabel('Prezime', { exact: true }).fill(last)
}

test.describe('onboarding after sign-up', () => {
  test('asks for first and last name and does not ask for a phone', async ({ page }) => {
    await page.goto('/auth/welcome')

    await expect(page.getByTestId('onboarding-step')).toHaveText('Korak 1 od 3')
    await expect(page.getByLabel('Ime', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Prezime', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Lokacija (opciono)')).toBeVisible()
    await expect(page.locator('#onboarding-phone')).toHaveCount(0)
  })

  test('requires both names before continuing', async ({ page }) => {
    const saved = await stubWrites(page)
    await page.goto('/auth/welcome')

    await fillNames(page, '', '')
    await page.getByRole('button', { name: 'Nastavi' }).click()

    await expect(page.getByText('Unesi ime.')).toBeVisible()
    await expect(page.getByText('Unesi prezime.')).toBeVisible()
    await expect(page.getByTestId('onboarding-step')).toHaveText('Korak 1 od 3')
    expect(saved.profile).toHaveLength(0)
  })

  test('typed address that was not picked from the suggestions is rejected', async ({ page }) => {
    const saved = await stubWrites(page)
    await stubGeocode(page)
    await page.goto('/auth/welcome')

    await fillNames(page, 'Ana', 'Anić')
    await page.getByLabel('Lokacija (opciono)').fill('Knez Mi')
    await page.getByRole('button', { name: 'Nastavi' }).click()

    await expect(page.getByText('Izaberi adresu iz ponuđenih rezultata.')).toBeVisible()
    expect(saved.profile).toHaveLength(0)
  })

  test('name, searched location, skip verification, then to the profile', async ({ page }) => {
    const saved = await stubWrites(page)
    await stubGeocode(page)
    await page.goto('/auth/welcome')

    await fillNames(page, 'Ana', 'Anić')
    await page.getByLabel('Lokacija (opciono)').fill('Knez Mihailova')
    await page.getByTestId('geocode-result').first().click()
    await page.getByRole('button', { name: 'Nastavi' }).click()

    await expect(page.getByTestId('onboarding-step')).toHaveText('Korak 2 od 3')
    expect(saved.profile).toEqual([{ first_name: 'Ana', last_name: 'Anić' }])
    expect(saved.locations).toHaveLength(1)
    expect(saved.locations[0]).toMatchObject({
      street: 'Knez Mihailova 1',
      city: 'Beograd',
      is_default: true,
    })

    await expect(page.getByRole('heading', { name: 'Želiš da potvrdiš identitet?' })).toBeVisible()
    await page.getByRole('button', { name: 'Ne, preskoči za sada' }).click()

    await expect(page.getByTestId('onboarding-step')).toHaveText('Korak 3 od 3')
    await expect(page.getByRole('heading', { name: 'Dobro došao na SND' })).toBeVisible()
    await page.getByRole('button', { name: 'Počni' }).click()

    await expect(page).toHaveURL(/\/profile\/?$/)
  })

  test('choosing to verify goes to the identity verification page', async ({ page }) => {
    await stubWrites(page)
    await page.goto('/auth/welcome')

    await fillNames(page, 'Ana', 'Anić')
    await page.getByRole('button', { name: 'Nastavi' }).click()
    await page.getByRole('button', { name: 'Da, potvrdi identitet' }).click()

    await expect(page).toHaveURL(/\/profile\/settings\/verification/)
  })
})
