'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/auth/authService'
import { queryKeys } from '@/lib/queryKeys'
import type {
  SignUpInput,
  SignInInput,
  VerifyOtpInput,
  ResetPasswordInput,
  UpdatePasswordInput,
  ResendOtpInput,
} from '@/types'

export function useSignUp() {
  const router = useRouter()

  return useMutation({
    mutationFn: (input: SignUpInput) => authService.signUp(input),
    onSuccess: (_data, variables) => {
      // session is null when Confirm email = ON → user must enter OTP
      router.push(
        `/verifikacija?email=${encodeURIComponent(variables.email.trim().toLowerCase())}&tip=registracija`
      )
    },
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignInInput) => authService.signIn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => {
      queryClient.clear()
      router.push('/')
      router.refresh()
    },
  })
}

export function useVerifyOtp() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (input: VerifyOtpInput) => authService.verifyOtp(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all })

      const flowType = new URLSearchParams(window.location.search).get('tip')
      if (flowType === 'registracija') {
        router.push('/dobrodosli')
      } else if (flowType === 'reset') {
        router.push('/nova-lozinka')
      } else {
        router.push('/')
      }
      router.refresh()
    },
  })
}

export function useResetPassword() {
  const router = useRouter()

  const redirectToVerification = (email: string) => {
    router.push(`/verifikacija?email=${encodeURIComponent(email.trim().toLowerCase())}&tip=reset`)
  }

  return useMutation({
    mutationFn: (input: ResetPasswordInput) => authService.resetPassword(input),
    onSuccess: (_data, variables) => {
      redirectToVerification(variables.email)
    },
    onError: (_error, variables) => {
      redirectToVerification(variables.email)
    },
  })
}

export function useUpdatePassword() {
  const router = useRouter()

  return useMutation({
    mutationFn: (input: UpdatePasswordInput) => authService.updatePassword(input),
    onSuccess: () => {
      router.push('/')
      router.refresh()
    },
  })
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (input: ResendOtpInput) => authService.resendOtp(input),
  })
}
