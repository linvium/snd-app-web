export interface SndUser {
  id: string
  email: string
  email_verified_at: string | null
  role: 'user' | 'admin'
  status: 'active' | 'suspended' | 'deleted'
  credit_balance_minor: number
  last_login_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  user_profiles: SndUserProfile | null
}

export interface SndUserProfile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  phone: string | null
  phone_verified_at: string | null
  avatar_url: string | null
  about: string | null
  primary_location_id: string | null
  country_code: string
  response_rate: number | null
  avg_response_minutes: number | null
  rating_avg: number | null
  rating_count: number
  created_at: string
  updated_at: string
}

export interface SndLocation {
  id: string
  user_id: string
  label: string
  street: string
  city: string
  postal_code: string | null
  country_code: string
  latitude: number
  longitude: number
  approx_latitude: number
  approx_longitude: number
  is_default: boolean
  created_at: string
  deleted_at: string | null
}

export const MAX_AVATAR_BYTES = 10 * 1024 * 1024
export const AVATAR_SIZE_PX = 512

export interface UpdateProfileInput {
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  phone?: string | null
  about?: string | null
  primary_location_id?: string | null
}

export interface AddLocationInput {
  label: string
  street: string
  city: string
  postal_code?: string
  latitude: number
  longitude: number
  is_default?: boolean
}

export interface UpdateLocationInput extends Partial<AddLocationInput> {}

/** Profile completeness score for the /profile completeness card */
export interface ProfileCompleteness {
  percentage: number
  items: {
    name: string
    completed: boolean
    link: string
  }[]
}

export function getDisplayName(
  profile: SndUserProfile | null | undefined,
  email: string
): string {
  if (profile?.display_name) return profile.display_name
  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name} ${profile.last_name.charAt(0)}.`
  }
  if (profile?.first_name) return profile.first_name
  const emailPrefix = email.split('@')[0] || 'Korisnik'
  return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
}

/** Format amount stored in paras. 110000 → "1.100 RSD" */
export function formatRsd(minor: number): string {
  const rsd = minor / 100
  return (
    rsd.toLocaleString('sr-RS', {
      minimumFractionDigits: rsd % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }) + ' RSD'
  )
}
