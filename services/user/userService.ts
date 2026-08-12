import { createClient } from '@/lib/supabase/client'
import type { SndUser, UpdateProfileInput } from '@/types'

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
