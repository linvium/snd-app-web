import { addDaysIso } from '@/lib/availability'

export type DatePresetId = 'today' | 'tomorrow' | 'this-weekend'

export interface DatePreset {
  id: DatePresetId
  from: string
  to: string
}

/** Local calendar day as YYYY-MM-DD, matching DateRangeCalendar's UTC-from-local rule. */
export function startOfLocalDayIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10)
}

function weekendRange(todayIso: string): { from: string; to: string } {
  const weekday = new Date(`${todayIso}T00:00:00Z`).getUTCDay()
  // Sunday: this Saturday is already past, so skip to next weekend.
  if (weekday === 0) {
    return { from: addDaysIso(todayIso, 6), to: addDaysIso(todayIso, 7) }
  }

  const daysUntilSaturday = 6 - weekday
  const saturday = addDaysIso(todayIso, daysUntilSaturday)
  return { from: saturday, to: addDaysIso(saturday, 1) }
}

export function datePresets(now: Date = new Date()): DatePreset[] {
  const today = startOfLocalDayIso(now)
  const tomorrow = addDaysIso(today, 1)
  const weekend = weekendRange(today)

  return [
    { id: 'today', from: today, to: today },
    { id: 'tomorrow', from: tomorrow, to: tomorrow },
    { id: 'this-weekend', from: weekend.from, to: weekend.to },
  ]
}
