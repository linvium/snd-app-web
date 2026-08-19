'use client'

import { useMemo } from 'react'

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
  /**
   * Days already taken (doc 04 §13). Search passes nothing — it filters by
   * availability rather than displaying it — so the default is an empty list
   * and every day stays selectable there.
   */
  unavailable?: readonly string[]
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function rangeCrossesTakenDay(from: string, to: string, taken: ReadonlySet<string>): boolean {
  if (taken.size === 0) return false

  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end)) return false

  for (let time = start; time <= end; time += 86_400_000) {
    if (taken.has(new Date(time).toISOString().slice(0, 10))) return true
  }
  return false
}

/**
 * Months stacked vertically and scrolled, rather than paged one at a time
 * (doc 03 §5.3). Picking a range means two taps: the first sets the start, the
 * second closes it — and a second tap before the start restarts the range
 * instead of producing an invalid one.
 */
export default function DateRangeCalendar({
  from,
  to,
  onChange,
  monthsAhead = 12,
  unavailable,
}: DateRangeCalendarProps) {
  const today = useMemo(startOfToday, [])
  const taken = useMemo(() => new Set(unavailable ?? []), [unavailable])

  const months = useMemo(() => {
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
  }, [today, monthsAhead])

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
    if (rangeCrossesTakenDay(from, iso, taken)) {
      onChange(iso, null)
      return
    }
    onChange(from, iso)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="sticky top-0 z-10 grid grid-cols-7 gap-1 bg-card pb-2 text-center text-[11px] font-semibold text-zinc-500">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      {months.map((month) => (
        <section key={month.key}>
          <h3 className="mb-3 text-[15px] font-semibold text-card-foreground">{month.label}</h3>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: month.leadingBlanks }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {month.days.map((day) => {
              const iso = toIso(day)
              const isPast = day < today
              const isTaken = taken.has(iso)
              const isDisabled = isPast || isTaken
              const isStart = iso === from
              const isEnd = iso === to
              const isBetween = Boolean(from && to && iso > from && iso < to)

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isStart || isEnd}
                  aria-label={isTaken ? `${iso} — zauzeto` : undefined}
                  onClick={() => handleSelect(iso)}
                  className={cn(
                    'grid h-11 cursor-pointer place-items-center rounded-md border-none bg-transparent text-sm transition-colors',
                    isPast && 'cursor-not-allowed text-zinc-300',
                    // A taken day is struck through rather than merely greyed:
                    // grey alone reads as "past" and invites a second tap.
                    isTaken && !isPast && 'cursor-not-allowed text-zinc-300 line-through',
                    !isDisabled && 'text-card-foreground hover:bg-muted',
                    isBetween && 'bg-brand-50 text-brand-700',
                    (isStart || isEnd) && 'bg-brand-500 font-semibold text-white hover:bg-brand-600'
                  )}
                >
                  {day.getUTCDate()}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
