import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'

import { OWNER_WITH_BOOKING, UNVERIFIED_USER, VERIFIED_USER } from './fixtures/users'
import { ensureTestImages } from './helpers/images'

const AUTH_DIR = path.join(process.cwd(), 'playwright/.auth')

async function loginAndSave(baseURL: string, email: string, password: string, file: string) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${baseURL}/auth/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Lozinka').fill(password)
  await page.getByRole('button', { name: 'Prijavi se' }).click()
  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 20_000 })
  } catch {
    const pageError = (await page.getByRole('alert').first().textContent().catch(() => null))?.trim()
    throw new Error(
      `Login failed for ${email}${pageError ? `: ${pageError}` : ''}. Seed test users first: npm run test:e2e:seed (needs SUPABASE_SERVICE_ROLE_KEY).`
    )
  }
  await page.context().storageState({ path: file })
  await browser.close()
}

function selectedProjectNames(): string[] {
  const names: string[] = []
  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i]
    if (arg === '--project' || arg === '-p') names.push(process.argv[i + 1] ?? '')
    if (arg?.startsWith('--project=')) names.push(arg.slice('--project='.length))
  }
  return names.filter(Boolean)
}

function needsAuthSetup(config: FullConfig): boolean {
  const selected = selectedProjectNames()
  const projects = selected.length
    ? config.projects.filter((project) => selected.includes(project.name))
    : config.projects
  return projects.some((project) => Boolean(project.use.storageState))
}

export default async function globalSetup(config: FullConfig) {
  if (!needsAuthSetup(config)) return

  await ensureTestImages()
  await mkdir(AUTH_DIR, { recursive: true })

  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3002'

  await loginAndSave(baseURL, VERIFIED_USER.email, VERIFIED_USER.password, path.join(AUTH_DIR, 'verified.json'))
  await loginAndSave(
    baseURL,
    UNVERIFIED_USER.email,
    UNVERIFIED_USER.password,
    path.join(AUTH_DIR, 'unverified.json')
  )
  await loginAndSave(
    baseURL,
    OWNER_WITH_BOOKING.email,
    OWNER_WITH_BOOKING.password,
    path.join(AUTH_DIR, 'owner-booking.json')
  )
}
