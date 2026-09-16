/**
 * Pricing settings that are not per-listing.
 *
 * There are no fee rates here on purpose: renting is not charged through the
 * platform, so the rental price the owner sets is the whole sum the renter pays
 * them. What SND charges for is listing, and that price list lives in the
 * `billing_plans` and `credit_packs` tables.
 */

/** How far ahead the calendar offers days (doc 04 §14). */
export const AVAILABILITY_MONTHS_AHEAD = 12
