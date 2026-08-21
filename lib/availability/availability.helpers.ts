import { AVAILABILITY_MONTHS_AHEAD } from '@/lib/pricing'

/**
 * Availability arithmetic (doc 00 §6.4).
 *
 * The set of taken days arrives from `blocked_dates`, which a trigger keeps in
 * step with accepted, booked and picked-up bookings — so everything here is set
 * membership over plain `YYYY-MM-DD` strings. Dates are handled as strings and
 * as UTC throughout: a `new Date('2026-08-20')` compared against a local
 * midnight is how off-by-one-day bugs get in.
 */

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function addDaysIso(iso: string, days: number): string {
  const time = Date.parse(`${iso}T00:00:00Z`)
  if (Number.isNaN(time)) return iso
  return new Date(time + days * 86_400_000).toISOString().slice(0, 10)
}

/** Every day from `start` to `end`, both ends included. */
export function datesInRange(startIso: string, endIso: string): string[] {
  const start = Date.parse(`${startIso}T00:00:00Z`)
  const end = Date.parse(`${endIso}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return []

  const days: string[] = []
  for (let time = start; time <= end; time += 86_400_000) {
    days.push(new Date(time).toISOString().slice(0, 10))
  }
  return days
}

export function isRangeAvailable(
  startIso: string,
  endIso: string,
  unavailable: ReadonlySet<string> | readonly string[]
): boolean {
  const taken = unavailable instanceof Set ? unavailable : new Set(unavailable)
  const days = datesInRange(startIso, endIso)
  if (days.length === 0) return false
  return days.every((day) => !taken.has(day))
}

export interface SuggestedRange {
  start: string
  end: string
}

/**
 * The nearest window of the same length that is free (doc 04 §13.1).
 *
 * Searching forward from the requested start rather than from today, because
 * someone who asked for the 20th wants the closest thing to the 20th — an
 * offer of tomorrow is not a better answer just because it is sooner.
 */
export function suggestNearestRange(
  startIso: string,
  endIso: string,
  unavailable: ReadonlySet<string> | readonly string[],
  options: { today?: string; monthsAhead?: number } = {}
): SuggestedRange | null {
  const taken = unavailable instanceof Set ? unavailable : new Set(unavailable)
  const length = datesInRange(startIso, endIso).length
  if (length === 0) return null

  const today = options.today ?? todayIso()
  const monthsAhead = options.monthsAhead ?? AVAILABILITY_MONTHS_AHEAD
  const horizon = addDaysIso(today, Math.round(monthsAhead * 30.5))

  let cursor = startIso < today ? today : startIso
  while (cursor <= horizon) {
    const candidateEnd = addDaysIso(cursor, length - 1)
    if (candidateEnd > horizon) break
    if (isRangeAvailable(cursor, candidateEnd, taken)) {
      return { start: cursor, end: candidateEnd }
    }
    cursor = addDaysIso(cursor, 1)
  }

  return null
}
