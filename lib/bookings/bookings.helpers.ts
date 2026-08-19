const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = Date.parse(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
}

/** Inclusive night/day count: 20–22 → 3. Both dates required. */
export function inclusiveDaysCount(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null
  if (!isIsoDate(from) || !isIsoDate(to) || to < from) return null
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000) + 1
}

/**
 * Internal snapshot only. Uses the 1-day rate and ignores 3/7-day packages,
 * so it must never be shown as "ukupno" in the UI.
 */
export function estimateRentalPriceMinor(
  daysCount: number | null | undefined,
  price1DayMinor: number
): number {
  if (daysCount == null || daysCount <= 0 || !Number.isFinite(price1DayMinor)) return 0
  return daysCount * price1DayMinor
}

export function previewMessage(body: string, maxLength = 160): string {
  const trimmed = body.trim()
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.slice(0, maxLength)
}
