/** Deterministic avatar color from user_id (same user → same color) */
export function colorFromUserId(userId: string): string {
  const colors = [
    '#2E8B5F',
    '#4FA97F',
    '#256F4C',
    '#2563EB',
    '#7C3AED',
    '#DC2626',
    '#D97706',
    '#0891B2',
    '#BE185D',
  ]
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function getProfileInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined
): string {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }
  if (firstName) return firstName.charAt(0).toUpperCase()
  return (email?.charAt(0) || '?').toUpperCase()
}

export function formatMemberSince(iso: string): string {
  try {
    const monthYear = new Intl.DateTimeFormat('sr-Latn-RS', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso))
    // sr-Latn already ends the month/year with a period; appending one gives "2026..".
    return `Član od ${monthYear.replace(/\.$/, '')}.`
  } catch {
    return ''
  }
}

export function locationIcon(label: string): string {
  const name = label.toLowerCase()
  if (/kuć|stan|dom|home/.test(name)) return '🏠'
  if (/posao|kancelarija|firma|office|work/.test(name)) return '💼'
  return '📍'
}

export const SERBIAN_CITIES = [
  'Beograd',
  'Novi Sad',
  'Niš',
  'Kragujevac',
  'Subotica',
  'Zrenjanin',
  'Pančevo',
  'Čačak',
  'Novi Pazar',
  'Kraljevo',
  'Smederevo',
  'Leskovac',
  'Valjevo',
  'Vranje',
  'Šabac',
  'Užice',
  'Požarevac',
  'Bor',
  'Sombor',
  'Pirot',
] as const

const PROFILE_DISMISS_KEY = 'profil_dopuna_zatvorena'
const DISMISS_DAYS = 30

export function isCompletenessCardDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(PROFILE_DISMISS_KEY)
    if (!raw) return false
    const dismissedAt = new Date(raw)
    if (Number.isNaN(dismissedAt.getTime())) return false
    const elapsedMs = Date.now() - dismissedAt.getTime()
    return elapsedMs < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function dismissCompletenessCard(): void {
  if (typeof window === 'undefined') return
  try {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(PROFILE_DISMISS_KEY, today)
  } catch {
    // ignore storage errors
  }
}

/** Strip +381 prefix for the edit form local input */
export function phoneLocalPart(phone: string | null | undefined): string {
  if (!phone) return ''
  if (phone.startsWith('+381')) return phone.slice(4)
  return phone
}

export const DEFAULT_PHONE_COUNTRY_CODE = '+381'

/**
 * Calling codes offered on the sign-in and sign-up forms. +387 is temporary;
 * delete its entry to go back to Serbia only (the selector hides itself when
 * one code is left).
 */
export const PHONE_COUNTRY_CODES = [
  { code: '+381', label: 'Srbija' },
  { code: '+387', label: 'BiH' },
] as const

/** Normalize a phone to E.164. Without a leading +, the given calling code is used. */
export function normalizePhone(raw: string, countryCode: string = DEFAULT_PHONE_COUNTRY_CODE): string {
  let value = raw.trim().replace(/\s+/g, '')
  if (!value) return ''
  if (value.startsWith('0')) {
    value = countryCode + value.slice(1)
  } else if (!value.startsWith('+')) {
    value = countryCode + value
  }
  return value
}

export function isValidSerbianPhone(e164: string): boolean {
  // +381 + 8–9 digits (landline / mobile), no leading 0 after country code
  return /^\+381[1-9]\d{7,8}$/.test(e164)
}

export function isValidBosnianPhone(e164: string): boolean {
  // +387 + 7–9 digits (landline 8, mobile 8 or 9, e.g. 060 xxx xxxx), no leading 0 after country code
  return /^\+387[1-9]\d{6,8}$/.test(e164)
}

/** Any calling code in PHONE_COUNTRY_CODES. */
export function isValidPhone(e164: string): boolean {
  return isValidSerbianPhone(e164) || isValidBosnianPhone(e164)
}
