import { describe, expect, it } from 'vitest'

import { listingStatusAction } from '@/lib/listings/listings.status'

describe('listingStatusAction', () => {
  it('publishes a draft and archives a published listing', () => {
    expect(listingStatusAction('draft', 'published')).toBe('publish')
    expect(listingStatusAction('published', 'paused')).toBe('pause')
    expect(listingStatusAction('paused', 'published')).toBe('resume')
  })

  it('returns published or archived listings to draft', () => {
    expect(listingStatusAction('published', 'draft')).toBe('unpublish')
    expect(listingStatusAction('paused', 'draft')).toBe('unpublish')
  })

  it('does not allow the current status or archiving a draft', () => {
    expect(listingStatusAction('published', 'published')).toBeNull()
    expect(listingStatusAction('draft', 'draft')).toBeNull()
    expect(listingStatusAction('paused', 'paused')).toBeNull()
    expect(listingStatusAction('draft', 'paused')).toBeNull()
  })
})
