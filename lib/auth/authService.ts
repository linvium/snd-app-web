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
  signUp: async ({ email, password }: SignUpInput) => {
    const supabase = getClient()
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw error
    // With Confirm email ON: data.user exists, data.session is null → OTP required
    return data
  },

  signIn: async ({ email, password }: SignInInput) => {
    const supabase = getClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    const supabase = getClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  verifyOtp: async ({ email, token, type }: VerifyOtpInput) => {
    const supabase = getClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    })
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

  resendOtp: async ({ email, flowType }: ResendOtpInput) => {
    const supabase = getClient()
    const normalizedEmail = email.trim().toLowerCase()

    if (flowType === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail)
      if (error && !error.message.toLowerCase().includes('not found')) throw error
      return
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
    })
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
