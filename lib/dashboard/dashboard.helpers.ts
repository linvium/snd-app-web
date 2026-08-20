import type {
  DashboardAction,
  DashboardListingRow,
  DashboardTotals,
  ProfileCompleteness,
} from '@/types'

/** "Dobro jutro" / "Dobar dan" / "Dobro veče" from the local hour. */
export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Dobro veče'
  if (hour < 12) return 'Dobro jutro'
  if (hour < 18) return 'Dobar dan'
  return 'Dobro veče'
}

export function formatLongDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('sr-Latn-RS', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date)
  } catch {
    return ''
  }
}

/**
 * "1 stvar čeka tebe" / "3 stvari čekaju tebe" / "7 stvari čeka tebe" —
 * Serbian agreement, which does not survive a naive `${n} stvari`.
 */
export function pendingActionsLabel(count: number): string {
  if (count <= 0) return 'Ništa ne čeka tvoju akciju'

  const lastTwo = count % 100
  const last = count % 10
  const teens = lastTwo >= 11 && lastTwo <= 14

  if (!teens && last === 1) return `${count} stvar čeka tebe`
  if (!teens && last >= 2 && last <= 4) return `${count} stvari čekaju tebe`
  return `${count} stvari čeka tebe`
}

/** 1284 → "1.284" */
export function formatCount(value: number): string {
  return new Intl.NumberFormat('sr-RS').format(value)
}

/** 4.87 → "4,9"; null → "—" */
export function formatRating(value: number | null): string {
  if (value == null) return '—'
  return value.toFixed(1).replace('.', ',')
}

/** 96.4 → "96%"; null → "—" */
export function formatPercent(value: number | null): string {
  if (value == null) return '—'
  return `${Math.round(value)}%`
}

/** 95 → "~1 h 35 min"; null when the metric has not been computed yet. */
export function formatResponseTime(minutes: number | null): string | null {
  if (minutes == null || minutes < 0) return null
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest === 0 ? `~${hours} h` : `~${hours} h ${rest} min`
  return `~${Math.round(hours / 24)} d`
}

export const LISTING_STATUS_LABEL: Record<string, string> = {
  published: 'Aktivan',
  draft: 'Nacrt',
  paused: 'Pauziran',
  rejected: 'Odbijen',
  deleted: 'Obrisan',
}

/**
 * The rows the dashboard shows first: live listings before parked ones, then
 * whatever is actually drawing requests and views.
 */
export function rankDashboardListings(
  rows: DashboardListingRow[],
  limit = 5
): DashboardListingRow[] {
  const weight = (row: DashboardListingRow) =>
    row.status === 'published' ? 2 : row.status === 'paused' ? 1 : 0

  return [...rows]
    .sort((left, right) => {
      const statusDelta = weight(right) - weight(left)
      if (statusDelta !== 0) return statusDelta
      const requestDelta = right.request_count - left.request_count
      if (requestDelta !== 0) return requestDelta
      return right.view_count - left.view_count
    })
    .slice(0, limit)
}

const TONE_ORDER: Record<DashboardAction['tone'], number> = {
  urgent: 0,
  attention: 1,
  calm: 2,
}

export function sortActions(actions: DashboardAction[]): DashboardAction[] {
  return [...actions].sort((left, right) => TONE_ORDER[left.tone] - TONE_ORDER[right.tone])
}

export function profileActionTitle(name: string): string {
  switch (name) {
    case 'Ime i prezime':
      return 'Dodaj ime i prezime'
    case 'Profilna slika':
      return 'Dodaj profilnu sliku'
    case 'Broj telefona':
      return 'Dodaj broj telefona'
    case 'Lokacija':
      return 'Dodaj lokaciju preuzimanja'
    case 'O meni':
      return 'Dopuni „O meni“'
    case 'KYC verifikacija':
      return 'Potvrdi identitet'
    default:
      return name
  }
}

/**
 * Completeness gaps become queue rows, so the profile nag is not a second
 * to-do list competing with the real one further down the page.
 */
export function completenessActions(
  completeness: ProfileCompleteness,
  limit = 2
): DashboardAction[] {
  return completeness.items.slice(0, limit).map((item) => ({
    id: `profile:${item.name}`,
    kind: 'profile' as const,
    tone: 'calm' as const,
    title: profileActionTitle(item.name),
    detail: 'Popunjen profil dobija više zahteva.',
    href: item.link,
    cta: 'Dopuni',
    thumbnail_url: null,
  }))
}

/** True when the account has nothing listed and nothing pending yet. */
export function totalsAreEmpty(totals: DashboardTotals): boolean {
  return (
    totals.listings_published === 0 &&
    totals.listings_draft === 0 &&
    totals.listings_paused === 0 &&
    totals.open_requests === 0
  )
}
