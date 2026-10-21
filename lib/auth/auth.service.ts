import { createClient } from '@/lib/supabase/client'
import type {
  SignUpInput,
  SignInInput,
  VerifyOtpInput,
  ResetPasswordInput,
  UpdatePasswordInput,
  ResendOtpInput,
} from '@/types'

const getClient = () => createClient()

export const authService = {
  signUp: async (input: SignUpInput) => {
    const supabase = getClient()
    const { data, error } =
      input.method === 'phone'
        ? await supabase.auth.signUp({ phone: input.phone, password: input.password })
        : await supabase.auth.signUp({
            email: input.email.trim().toLowerCase(),
            password: input.password,
          })
    if (error) throw error
    // With Confirm email/phone ON: data.user exists, data.session is null → OTP required
    return data
  },

  signIn: async (input: SignInInput) => {
    const supabase = getClient()
    const { data, error } =
      input.method === 'phone'
        ? await supabase.auth.signInWithPassword({ phone: input.phone, password: input.password })
        : await supabase.auth.signInWithPassword({
            email: input.email.trim().toLowerCase(),
            password: input.password,
          })
    if (error) throw error
    return data
  },

  signOut: async () => {
    const supabase = getClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  verifyOtp: async ({ email, phone, token, type }: VerifyOtpInput) => {
    const supabase = getClient()
    const { data, error } =
      type === 'sms'
        ? await supabase.auth.verifyOtp({ phone: phone!, token, type: 'sms' })
        : await supabase.auth.verifyOtp({ email: email!, token, type })
    if (error) throw error
    return data
  },

  resetPassword: async ({ email }: ResetPasswordInput) => {
    const supabase = getClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
    // Avoid user enumeration — ignore "not found" style errors
    if (error && !error.message.toLowerCase().includes('not found')) throw error
  },

  updatePassword: async ({ password }: UpdatePasswordInput) => {
    const supabase = getClient()
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    return data
  },

  resendOtp: async ({ email, phone, flowType }: ResendOtpInput) => {
    const supabase = getClient()

    if (flowType === 'reset') {
      // Phone-based password reset isn't supported yet — reset stays email-only.
      const normalizedEmail = (email ?? '').trim().toLowerCase()
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail)
      if (error && !error.message.toLowerCase().includes('not found')) throw error
      return
    }

    const { error } = phone
      ? await supabase.auth.resend({ type: 'sms', phone })
      : await supabase.auth.resend({ type: 'signup', email: (email ?? '').trim().toLowerCase() })
    if (error) throw error
  },

  getSession: async () => {
    const supabase = getClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  onAuthStateChange: (callback: Parameters<ReturnType<typeof getClient>['auth']['onAuthStateChange']>[0]) => {
    const supabase = getClient()
    return supabase.auth.onAuthStateChange(callback)
  },
}
