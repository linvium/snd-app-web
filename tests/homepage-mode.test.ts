import { describe, expect, it } from 'vitest'
import { parseHomepageMode } from '@/lib/home/homepage-mode'

describe('parseHomepageMode', () => {
  it('uses landing until explicitly switched to the app homepage', () => {
    expect(parseHomepageMode(undefined)).toBe('landing')
    expect(parseHomepageMode('landing')).toBe('landing')
    expect(parseHomepageMode('app')).toBe('app')
    expect(parseHomepageMode('something-else')).toBe('landing')
  })
})
