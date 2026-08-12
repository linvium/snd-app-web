export interface SignUpInput {
  email: string
  password: string
}

export interface SignInInput {
  email: string
  password: string
}

export interface VerifyOtpInput {
  email: string
  token: string
  type: 'email' | 'recovery'
}

export interface ResetPasswordInput {
  email: string
}

export interface UpdatePasswordInput {
  password: string
}

export interface ResendOtpInput {
  email: string
  flowType: 'registracija' | 'reset'
}
