import { describe, expect, it } from 'vitest'

import {
  completenessActions,
  formatCount,
  formatPercent,
  formatRating,
  formatResponseTime,
  greetingForHour,
  pendingActionsLabel,
  profileActionTitle,
  rankDashboardListings,
  sortActions,
  totalsAreEmpty,
} from '@/lib/dashboard'
import type { DashboardAction, DashboardListingRow, DashboardTotals } from '@/types'

function listing(overrides: Partial<DashboardListingRow>): DashboardListingRow {
  return {
    id: 'id',
    slug: null,
    title: 'Naslov',
    thumbnail_url: null,
    price_1_day_minor: 1000,
    status: 'published',
    view_count: 0,
    favorite_count: 0,
    request_count: 0,
    ...overrides,
  }
}

describe('greetingForHour', () => {
  it('covers the whole day', () => {
    expect(greetingForHour(2)).toBe('Dobro veče')
    expect(greetingForHour(8)).toBe('Dobro jutro')
    expect(greetingForHour(13)).toBe('Dobar dan')
    expect(greetingForHour(21)).toBe('Dobro veče')
  })
})

describe('pendingActionsLabel', () => {
  it('agrees in Serbian', () => {
    expect(pendingActionsLabel(0)).toBe('Ništa ne čeka tvoju akciju')
    expect(pendingActionsLabel(1)).toBe('1 stvar čeka tebe')
    expect(pendingActionsLabel(3)).toBe('3 stvari čekaju tebe')
    expect(pendingActionsLabel(7)).toBe('7 stvari čeka tebe')
    expect(pendingActionsLabel(11)).toBe('11 stvari čeka tebe')
    expect(pendingActionsLabel(21)).toBe('21 stvar čeka tebe')
    expect(pendingActionsLabel(22)).toBe('22 stvari čekaju tebe')
  })
})

describe('number formatting', () => {
  it('formats counts, ratings and percents', () => {
    expect(formatCount(1284)).toBe('1.284')
    expect(formatRating(4.87)).toBe('4,9')
    expect(formatRating(null)).toBe('—')
    expect(formatPercent(96.4)).toBe('96%')
    expect(formatPercent(null)).toBe('—')
  })

  it('formats response time in bands', () => {
    expect(formatResponseTime(null)).toBeNull()
    expect(formatResponseTime(-1)).toBeNull()
    expect(formatResponseTime(12)).toBe('~12 min')
    expect(formatResponseTime(60)).toBe('~1 h')
    expect(formatResponseTime(95)).toBe('~1 h 35 min')
    expect(formatResponseTime(60 * 48)).toBe('~2 d')
  })
})

describe('rankDashboardListings', () => {
  it('puts live listings first, then demand', () => {
    const rows = [
      listing({ id: 'draft', status: 'draft', request_count: 9, view_count: 900 }),
      listing({ id: 'quiet', status: 'published', request_count: 0, view_count: 10 }),
      listing({ id: 'busy', status: 'published', request_count: 4, view_count: 5 }),
      listing({ id: 'paused', status: 'paused', request_count: 7 }),
    ]

    expect(rankDashboardListings(rows).map((row) => row.id)).toEqual([
      'busy',
      'quiet',
      'paused',
      'draft',
    ])
  })

  it('caps the list', () => {
    const rows = Array.from({ length: 9 }, (_, index) => listing({ id: `l${index}` }))
    expect(rankDashboardListings(rows, 3)).toHaveLength(3)
  })
})

describe('sortActions', () => {
  it('orders urgent before attention before calm', () => {
    const make = (tone: DashboardAction['tone']): DashboardAction => ({
      id: tone,
      kind: 'request',
      tone,
      title: '',
      detail: '',
      href: '#',
      cta: '',
      thumbnail_url: null,
    })

    expect(sortActions([make('calm'), make('urgent'), make('attention')]).map((a) => a.tone)).toEqual(
      ['urgent', 'attention', 'calm']
    )
  })
})

describe('completenessActions', () => {
  it('turns the first gaps into calm queue rows', () => {
    const actions = completenessActions(
      {
        percentage: 40,
        items: [
          { name: 'Profilna slika', completed: false, link: '/a' },
          { name: 'KYC verifikacija', completed: false, link: '/b' },
          { name: 'O meni', completed: false, link: '/c' },
        ],
      },
      2
    )

    expect(actions).toHaveLength(2)
    expect(actions[0].title).toBe('Dodaj profilnu sliku')
    expect(actions[0].tone).toBe('calm')
    expect(actions[1].href).toBe('/b')
  })
})

describe('profileActionTitle', () => {
  it('falls back to the raw name', () => {
    expect(profileActionTitle('Nešto novo')).toBe('Nešto novo')
    expect(profileActionTitle('Lokacija')).toBe('Dodaj lokaciju preuzimanja')
  })
})

describe('totalsAreEmpty', () => {
  const base: DashboardTotals = {
    listings_published: 0,
    listings_draft: 0,
    listings_paused: 0,
    views: 0,
    saves: 0,
    open_requests: 0,
    unread_messages: 0,
    rating_avg: null,
    rating_count: 0,
    response_rate: null,
    avg_response_minutes: null,
  }

  it('ignores counters that do not mean activity', () => {
    expect(totalsAreEmpty({ ...base, views: 500 })).toBe(true)
    expect(totalsAreEmpty({ ...base, listings_draft: 1 })).toBe(false)
    expect(totalsAreEmpty({ ...base, open_requests: 1 })).toBe(false)
  })
})
