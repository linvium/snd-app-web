import { ApiError } from '@/lib/search/search.service'
import { createClient } from '@/lib/supabase/client'
import type { ApiErrorBody } from '@/types/search'
import type { SndUser, UpdateProfileInput } from '@/types'

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiError(
      response.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Nismo mogli da sačuvamo sliku. Pokušaj ponovo.' }
    )
  }
  return (await response.json()) as T
}

const getClient = () => createClient()

function normalizeUser(data: SndUser & { user_profiles?: SndUser['user_profiles'] | SndUser['user_profiles'][] }): SndUser {
  return {
    ...data,
    user_profiles: Array.isArray(data.user_profiles)
      ? data.user_profiles[0] ?? null
      : data.user_profiles ?? null,
  }
}

export const userService = {
  getCurrentUser: async (): Promise<SndUser | null> => {
    const supabase = getClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('users')
      .select(
        `
        *,
        user_profiles (*)
      `
      )
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    return normalizeUser(data as SndUser)
  },

  updateProfile: async (input: UpdateProfileInput): Promise<void> => {
    const supabase = getClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Nije prijavljen')

    const { error } = await supabase.from('user_profiles').update(input).eq('user_id', user.id)

    if (error) throw error
  },

  uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
    const form = new FormData()
    form.append('file', file)
    const response = await fetch('/api/v1/profile/avatar', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    })
    const payload = await parseJson<{ data: { avatar_url: string } }>(response)
    return payload.data
  },

  getPublicProfile: async (userId: string) => {
    const supabase = getClient()

    const { data, error } = await supabase
      .from('users')
      .select(
        `
        id,
        created_at,
        user_profiles (
          first_name,
          display_name,
          avatar_url,
          about,
          response_rate,
          avg_response_minutes,
          rating_avg,
          rating_count,
          country_code
        )
      `
      )
      .eq('id', userId)
      .eq('status', 'active')
      .single()

    if (error) throw error
    return data
  },
}
