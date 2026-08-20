import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'sr-RS',
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'verified',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/verified.json' },
      testMatch: [
        '**/listings/publish.spec.ts',
        '**/listings/draft.spec.ts',
        '**/listings/photos.spec.ts',
        '**/listings/edit.spec.ts',
        '**/bookings/request.spec.ts',
        '**/messages/thread.spec.ts',
        '**/favorites/list.spec.ts',
        '**/dashboard/actions.spec.ts',
        '**/profile/edit.spec.ts',
      ],
    },
    {
      name: 'unverified',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/unverified.json' },
      testMatch: ['**/listings/auth-gate.spec.ts'],
    },
    {
      name: 'owner-booking',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/owner-booking.json' },
      testMatch: ['**/listings/edit.spec.ts', '**/bookings/request.spec.ts'],
    },
    {
      name: 'guest',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/layout/header.spec.ts', '**/search/dates.spec.ts', '**/home/listings.spec.ts'],
    },
  ],
})
