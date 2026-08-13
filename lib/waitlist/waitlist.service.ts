import { createClient } from '@/lib/supabase/client'
import { validateEmail } from './waitlist.validation'

const getClient = () => createClient()

const UNIQUE_VIOLATION = '23505'

export type JoinWaitlistResult = {
  alreadyJoined: boolean
}

export const waitlistService = {
  join: async (email: string): Promise<JoinWaitlistResult> => {
    const normalized = email.trim().toLowerCase()
    const validationError = validateEmail(normalized)
    if (validationError) throw new Error(validationError)

    const supabase = getClient()
    const { error } = await supabase.from('waitlist_emails').insert({ email: normalized })

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { alreadyJoined: true }
      }
      throw error
    }

    return { alreadyJoined: false }
  },
}
