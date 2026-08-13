export type HomepageMode = 'landing' | 'app'

export function parseHomepageMode(value: string | undefined): HomepageMode {
  return value === 'app' ? 'app' : 'landing'
}

export function getHomepageMode(): HomepageMode {
  return parseHomepageMode(process.env.NEXT_PUBLIC_HOMEPAGE_MODE)
}

export function isLandingHomepage(): boolean {
  return getHomepageMode() === 'landing'
}
