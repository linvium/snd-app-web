/**
 * Platform commission (doc 00 §6.2).
 *
 * Doc 00 flags these percentages as a proposal the client has not confirmed and
 * requires them to be configurable rather than compiled in, so they read from
 * the environment with the documented values as the fallback. Changing a rate
 * is a deploy variable, not a code change.
 */

/** Takes a percentage from either source and always returns a fraction. */
function rateFromEnv(raw: string | undefined, fallbackPercent: number): number {
  const parsed = Number(raw)
  const percent =
    raw !== undefined && raw !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
      ? parsed
      : fallbackPercent
  return percent / 100
}

/** Paid by the renter, added on top of the rental price. */
export const RENTER_SERVICE_FEE_RATE = rateFromEnv(process.env.NEXT_PUBLIC_RENTER_FEE_PERCENT, 10)

/** Paid by the owner, deducted from the payout. */
export const OWNER_COMMISSION_RATE = rateFromEnv(process.env.NEXT_PUBLIC_OWNER_FEE_PERCENT, 5)

/** How far ahead the calendar offers days (doc 04 §14). */
export const AVAILABILITY_MONTHS_AHEAD = 12
