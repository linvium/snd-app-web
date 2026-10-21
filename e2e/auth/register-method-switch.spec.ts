import { expect, test, type Page } from '@playwright/test'

// A real sign-up would create an account and send an SMS or email, so the
// Supabase call is answered here. The spec covers what the page owns: the
// method switch, validation, and where it sends the user next.
async function mockSignUp(page: Page, user: Record<string, unknown>) {
  await page.route('**/auth/v1/signup*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '11111111-1111-4111-8111-111111111111',
        aud: 'authenticated',
        role: '',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
        ...user,
      }),
    })
  )
}

test.describe('register method switch', () => {
  test('defaults to email and swaps the identifier field for a phone field', async ({ page }) => {
    await page.goto('/auth/register')

    await expect(page.getByRole('tab', { name: 'Email' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
    await expect(page.locator('#phone')).toHaveCount(0)

    await page.getByRole('tab', { name: 'Telefon' }).click()

    await expect(page.getByRole('tab', { name: 'Telefon' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#phone')).toBeVisible()
    await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0)
    // Password is required for both methods.
    await expect(page.getByLabel('Lozinka', { exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'Email' }).click()
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  })

  test('rejects an invalid phone number without calling Supabase', async ({ page }) => {
    let signUpCalls = 0
    await page.route('**/auth/v1/signup*', (route) => {
      signUpCalls += 1
      return route.abort()
    })

    await page.goto('/auth/register')
    await page.getByRole('tab', { name: 'Telefon' }).click()
    await page.locator('#phone').fill('12345')
    await page.getByLabel('Lozinka', { exact: true }).fill('lozinka123')
    await page.getByRole('checkbox').click()
    await page.getByRole('button', { name: 'Napravi nalog' }).click()

    await expect(page.getByText('Unesi ispravan broj telefona.')).toBeVisible()
    await expect(page).toHaveURL(/\/auth\/register/)
    expect(signUpCalls).toBe(0)
  })

  test('phone sign-up continues to the verification screen for that number', async ({ page }) => {
    await mockSignUp(page, { phone: '+381641234567' })

    await page.goto('/auth/register')
    await page.getByRole('tab', { name: 'Telefon' }).click()
    await page.locator('#phone').fill('641234567')
    await page.getByLabel('Lozinka', { exact: true }).fill('lozinka123')
    await page.getByRole('checkbox').click()
    await page.getByRole('button', { name: 'Napravi nalog' }).click()

    await expect(page).toHaveURL(/\/auth\/verify/)
    const url = new URL(page.url())
    expect(url.searchParams.get('identifier')).toBe('+381641234567')
    expect(url.searchParams.get('channel')).toBe('phone')
    expect(url.searchParams.get('type')).toBe('register')

    await expect(page.getByRole('heading', { name: 'Proveri poruke' })).toBeVisible()
    await expect(page.getByText('+381641234567')).toBeVisible()
  })

  test('email sign-up still continues to the email verification screen', async ({ page }) => {
    await mockSignUp(page, { email: 'ana@example.com' })

    await page.goto('/auth/register')
    await page.getByLabel('Email', { exact: true }).fill('Ana@Example.com')
    await page.getByLabel('Lozinka', { exact: true }).fill('lozinka123')
    await page.getByRole('checkbox').click()
    await page.getByRole('button', { name: 'Napravi nalog' }).click()

    await expect(page).toHaveURL(/\/auth\/verify/)
    const url = new URL(page.url())
    expect(url.searchParams.get('identifier')).toBe('ana@example.com')
    expect(url.searchParams.get('channel')).toBe('email')

    await expect(page.getByRole('heading', { name: 'Proveri sanduče' })).toBeVisible()
  })
})

test.describe('login method switch', () => {
  test('offers a phone field, and password reset only for email', async ({ page }) => {
    await page.goto('/auth/login')

    await expect(page.getByRole('link', { name: 'Zaboravljena lozinka?' })).toBeVisible()

    await page.getByRole('tab', { name: 'Telefon' }).click()

    await expect(page.locator('#phone')).toBeVisible()
    await expect(page.getByLabel('Lozinka', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Zaboravljena lozinka?' })).toHaveCount(0)
  })
})
