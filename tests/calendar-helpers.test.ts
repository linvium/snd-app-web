import { describe, expect, it } from 'vitest'

import { datePresets } from '@/lib/calendar'

describe('datePresets', () => {
  it('sets today, tomorrow, and Sat–Sun of this week from a Wednesday', () => {
    const presets = datePresets(new Date(2026, 7, 19))

    expect(presets).toEqual([
      { id: 'today', from: '2026-08-19', to: '2026-08-19' },
      { id: 'tomorrow', from: '2026-08-20', to: '2026-08-20' },
      { id: 'this-weekend', from: '2026-08-22', to: '2026-08-23' },
    ])
  })

  it('keeps this Saturday–Sunday when today is Saturday', () => {
    const weekend = datePresets(new Date(2026, 7, 22)).find((preset) => preset.id === 'this-weekend')
    expect(weekend).toEqual({ id: 'this-weekend', from: '2026-08-22', to: '2026-08-23' })
  })

  it('jumps to next Saturday–Sunday when today is Sunday', () => {
    const weekend = datePresets(new Date(2026, 7, 23)).find((preset) => preset.id === 'this-weekend')
    expect(weekend).toEqual({ id: 'this-weekend', from: '2026-08-29', to: '2026-08-30' })
  })
})
