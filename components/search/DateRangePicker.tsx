'use client'

import { useMemo } from 'react'

import DateRangeCalendar from '@/components/search/DateRangeCalendar'
import { datePresets, type DatePresetId } from '@/lib/calendar'
import { formatDateRange } from '@/lib/search'
import { cn } from '@/lib/utils'

const PRESET_LABELS: Record<DatePresetId, string> = {
  today: 'Danas',
  tomorrow: 'Sutra',
  'this-weekend': 'Ovaj vikend',
}

interface DateRangePickerProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  layout: 'split' | 'stack'
  monthsAhead?: number
  unavailable?: readonly string[]
}

export default function DateRangePicker({
  from,
  to,
  onChange,
  layout,
  monthsAhead,
  unavailable,
}: DateRangePickerProps) {
  const presets = useMemo(() => datePresets(), [])

  return (
    <div className={cn(layout === 'split' ? 'flex gap-5' : 'flex flex-col gap-4')}>
      <div
        className={cn(
          layout === 'split' ? 'flex w-[148px] shrink-0 flex-col gap-2' : 'flex gap-2'
        )}
      >
        {presets.map((preset) => {
          const selected = from === preset.from && to === preset.to
          return (
            <button
              key={preset.id}
              type="button"
              data-testid={`date-preset-${preset.id}`}
              aria-pressed={selected}
              onClick={() => onChange(preset.from, preset.to)}
              className={cn(
                'cursor-pointer rounded-2xl border bg-card px-3 py-2.5 text-left transition-colors',
                layout === 'stack' && 'min-w-0 flex-1',
                selected ? 'border-foreground' : 'border-border hover:border-zinc-400'
              )}
            >
              <span className="block text-sm font-semibold text-card-foreground">
                {PRESET_LABELS[preset.id]}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {formatDateRange(preset.from, preset.to)}
              </span>
            </button>
          )
        })}
      </div>

      {layout === 'stack' ? <div className="h-px bg-border" aria-hidden /> : null}

      <div className="min-w-0 flex-1">
        <DateRangeCalendar
          from={from}
          to={to}
          onChange={onChange}
          monthsAhead={monthsAhead}
          layout={layout === 'split' ? 'paged' : 'stacked'}
          unavailable={unavailable}
        />
      </div>
    </div>
  )
}
