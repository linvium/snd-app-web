import { describe, expect, it } from 'vitest'

import { listingStatusAction, listingStatusAfterAction, listingStatusConfirm } from '@/lib/listings/listings.status'

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

describe('listingStatusConfirm', () => {
  it('asks for confirmation before going live or leaving live', () => {
    expect(listingStatusConfirm('publish').title).toMatch(/Objaviti/)
    expect(listingStatusConfirm('pause').title).toMatch(/Arhivirati/)
    expect(listingStatusConfirm('resume').title).toMatch(/objaviti/)
    expect(listingStatusConfirm('unpublish').title).toMatch(/nacrt/)
    expect(listingStatusAfterAction('pause')).toBe('paused')
    expect(listingStatusAfterAction('unpublish')).toBe('draft')
    expect(listingStatusAfterAction('publish')).toBe('published')
  })
})
