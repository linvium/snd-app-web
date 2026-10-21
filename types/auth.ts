export type SignUpInput =
  | { method: 'email'; email: string; password: string }
  | { method: 'phone'; phone: string; password: string }

export type SignInInput =
  | { method: 'email'; email: string; password: string }
  | { method: 'phone'; phone: string; password: string }

export interface VerifyOtpInput {
  type: 'email' | 'recovery' | 'sms'
  email?: string
  phone?: string
  token: string
}

export interface ResetPasswordInput {
  email: string
}

export interface UpdatePasswordInput {
  password: string
}

export interface ResendOtpInput {
  flowType: 'register' | 'reset'
  email?: string
  phone?: string
}
