import { describe, expect, it } from 'vitest'

import { REQUESTS_PATH, requestThreadPath } from '@/lib/messages/messages.paths'

describe('request paths', () => {
  it('keeps the inbox under the profile sidebar', () => {
    expect(REQUESTS_PATH).toBe('/profile/requests')
  })

  it('opens a thread under the same inbox path', () => {
    expect(requestThreadPath('11111111-1111-4111-8111-111111111111')).toBe(
      '/profile/requests/11111111-1111-4111-8111-111111111111'
    )
  })
})
