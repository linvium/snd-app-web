'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { isRangeAvailable } from '@/lib/availability'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub', 'ned']
const MONTHS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
]

interface DateRangeCalendarProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  monthsAhead?: number
  layout?: 'paged' | 'stacked'
  /**
   * Days already taken (doc 04 §13). Search passes nothing — it filters by
   * availability rather than displaying it — so the default is an empty list
   * and every day stays selectable there.
   */
  unavailable?: readonly string[]
}

interface CalendarMonth {
  key: string
  label: string
  leadingBlanks: number
  days: Date[]
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function monthOffsetFromToday(iso: string | null, today: Date): number {
  if (!iso) return 0
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return 0
  return (date.getUTCFullYear() - today.getUTCFullYear()) * 12 + date.getUTCMonth() - today.getUTCMonth()
}

function buildMonths(today: Date, monthsAhead: number): CalendarMonth[] {
  return Array.from({ length: monthsAhead }, (_, offset) => {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1))
    const daysInMonth = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
    ).getUTCDate()

    // Monday-first, matching the Serbian week.
    const leadingBlanks = (first.getUTCDay() + 6) % 7

    return {
      key: `${first.getUTCFullYear()}-${first.getUTCMonth()}`,
      label: `${MONTHS[first.getUTCMonth()]} ${first.getUTCFullYear()}`,
      leadingBlanks,
      days: Array.from({ length: daysInMonth }, (_, index) =>
        new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), index + 1))
      ),
    }
  })
}

/**
 * Months stacked vertically and scrolled, rather than paged one at a time
 * (doc 03 §5.3) — unless `layout="paged"`, which shows one month with arrows.
 * Picking a range means two taps: the first sets the start, the second closes
 * it — and a second tap before the start restarts the range instead of
 * producing an invalid one.
 */
export default function DateRangeCalendar({
  from,
  to,
  onChange,
  monthsAhead = 12,
  layout = 'stacked',
  unavailable,
}: DateRangeCalendarProps) {
  const today = useMemo(startOfToday, [])
  const taken = useMemo(() => new Set(unavailable ?? []), [unavailable])
  const months = useMemo(() => buildMonths(today, monthsAhead), [today, monthsAhead])
  const [monthIndex, setMonthIndex] = useState(() =>
    Math.min(Math.max(monthOffsetFromToday(from, today), 0), monthsAhead - 1)
  )

  useEffect(() => {
    const offset = monthOffsetFromToday(from, today)
    if (offset < 0 || offset >= monthsAhead) return
    setMonthIndex(offset)
  }, [from, today, monthsAhead])

  const handleSelect = (iso: string) => {
    if (!from || (from && to)) {
      onChange(iso, null)
      return
    }
    if (iso < from) {
      onChange(iso, null)
      return
    }
    // Closing a range across a taken day would produce a booking that cannot
    // exist, so the second tap restarts the range instead.
    if (!isRangeAvailable(from, iso, taken)) {
      onChange(iso, null)
      return
    }
    onChange(from, iso)
  }

  const visibleMonths = layout === 'paged' ? [months[monthIndex]] : months

  return (
    <div className="flex flex-col gap-6">
      {layout === 'paged' ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Prethodni mesec"
            disabled={monthIndex === 0}
            onClick={() => setMonthIndex((index) => index - 1)}
            className="grid size-8 cursor-pointer place-items-center rounded-full border-none bg-transparent text-card-foreground disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            <ChevronLeftIcon className="size-5" aria-hidden />
          </button>
          <h3 className="text-[15px] font-semibold text-card-foreground">{months[monthIndex]?.label}</h3>
          <button
            type="button"
            aria-label="Sledeći mesec"
            disabled={monthIndex >= monthsAhead - 1}
            onClick={() => setMonthIndex((index) => index + 1)}
            className="grid size-8 cursor-pointer place-items-center rounded-full border-none bg-transparent text-card-foreground disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            <ChevronRightIcon className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          'grid grid-cols-7 text-center text-[11px] font-semibold text-zinc-500',
          layout === 'stacked' && 'sticky top-0 z-10 bg-card pb-2'
        )}
      >
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      {visibleMonths.map((month) => (
        <section key={month.key}>
          {layout === 'stacked' ? (
            <h3 className="mb-3 text-[15px] font-semibold text-card-foreground">{month.label}</h3>
          ) : null}
          <div className="grid grid-cols-7">
            {Array.from({ length: month.leadingBlanks }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {month.days.map((day) => (
              <DayButton
                key={toIso(day)}
                day={day}
                today={today}
                from={from}
                to={to}
                taken={taken}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function DayButton({
  day,
  today,
  from,
  to,
  taken,
  onSelect,
}: {
  day: Date
  today: Date
  from: string | null
  to: string | null
  taken: ReadonlySet<string>
  onSelect: (iso: string) => void
}) {
  const iso = toIso(day)
  const isPast = day < today
  const isTaken = taken.has(iso)
  const isDisabled = isPast || isTaken
  const isStart = iso === from
  const isEnd = iso === to
  const isBetween = Boolean(from && to && iso > from && iso < to)
  const hasRange = Boolean(from && to && from !== to)

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-pressed={isStart || isEnd}
      aria-label={isTaken ? `${iso} — zauzeto` : undefined}
      onClick={() => onSelect(iso)}
      className={cn(
        'relative grid h-11 cursor-pointer place-items-center border-none bg-transparent text-sm',
        isPast && 'cursor-not-allowed text-zinc-300',
        isTaken && !isPast && 'cursor-not-allowed text-zinc-300 line-through'
      )}
    >
      {isBetween ? <span className="absolute inset-y-1 inset-x-0 bg-zinc-100" aria-hidden /> : null}
      {isStart && hasRange ? (
        <span className="absolute inset-y-1 left-1/2 right-0 bg-zinc-100" aria-hidden />
      ) : null}
      {isEnd && hasRange ? (
        <span className="absolute inset-y-1 left-0 right-1/2 bg-zinc-100" aria-hidden />
      ) : null}
      <span
        className={cn(
          'relative z-10 grid size-9 place-items-center rounded-full',
          !isDisabled && !isStart && !isEnd && 'text-card-foreground hover:bg-muted',
          (isStart || isEnd) && 'bg-foreground font-semibold text-background'
        )}
      >
        {day.getUTCDate()}
      </span>
    </button>
  )
}
