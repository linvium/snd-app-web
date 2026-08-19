/**
 * Description rendering rules (doc 04 §6).
 *
 * Phone numbers and email addresses are replaced with "•••". The reason doc 04
 * gives is commercial — a deal struck off-platform loses the renter the
 * guarantee and the platform its commission — but the safety half matters more:
 * a conversation that never happens on the platform is one that cannot be
 * moderated or evidenced when something goes wrong.
 *
 * URLs are left as inert text for the same reason, never linkified.
 */

export const DESCRIPTION_MASK = '•••'

/** Longer than this collapses behind "Prikaži više" (doc 04 §6). */
export const DESCRIPTION_TRUNCATE_AT = 400

const EMAIL_RE = /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}/giu

/**
 * Serbian numbers as people actually type them: +381 64 123 4567, 0641234567,
 * 064/123-4567, 064 123 45 67. Requires at least eight digits so that prices
 * ("25000 RSD"), years and model numbers ("GSB 13 RE") survive intact.
 */
const PHONE_RE = /(?:\+\s?381|00\s?381|\b0)(?:[\s./-]?\d){7,11}\b/g

/** Digits spelled out to dodge the filter: "nula šest četiri…" is out of scope,
 *  but "0 6 4 1 2 3 4 5 6 7" is the cheap trick and is not. */
const SPACED_DIGITS_RE = /\b(?:\d[\s.]){7,}\d\b/g

export interface MaskedDescription {
  text: string
  /** Drives the "Kontakt podaci se razmenjuju kroz poruke" note (doc 04 §6). */
  hasMaskedContact: boolean
}

export function maskContactDetails(raw: string | null | undefined): MaskedDescription {
  if (!raw) return { text: '', hasMaskedContact: false }

  let masked = false
  const replace = (value: string, pattern: RegExp) =>
    value.replace(pattern, () => {
      masked = true
      return DESCRIPTION_MASK
    })

  // Email first: an address can contain a digit run that the phone pattern
  // would otherwise bite into, leaving half an address on the page.
  let text = replace(raw, EMAIL_RE)
  text = replace(text, PHONE_RE)
  text = replace(text, SPACED_DIGITS_RE)

  return { text, hasMaskedContact: masked }
}

export interface DescriptionParts {
  text: string
  hasMaskedContact: boolean
  /** The part shown before the reader asks for the rest. */
  preview: string
  isTruncated: boolean
}

/**
 * Cuts at a word boundary rather than mid-word, so the collapsed state does not
 * end on a fragment.
 */
export function prepareDescription(
  raw: string | null | undefined,
  limit = DESCRIPTION_TRUNCATE_AT
): DescriptionParts {
  const { text, hasMaskedContact } = maskContactDetails(raw)

  if (text.length <= limit) {
    return { text, hasMaskedContact, preview: text, isTruncated: false }
  }

  const window = text.slice(0, limit)
  const lastBreak = Math.max(window.lastIndexOf(' '), window.lastIndexOf('\n'))
  const preview = (lastBreak > limit * 0.6 ? window.slice(0, lastBreak) : window).trimEnd()

  return { text, hasMaskedContact, preview, isTruncated: true }
}
