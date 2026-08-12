export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) return 'weak'
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)
  if (hasLetter && hasNumber && hasSpecial && password.length >= 10) return 'strong'
  if (hasLetter && hasNumber) return 'medium'
  return 'weak'
}

export function validatePassword(password: string): string {
  if (!password) return 'Unesi lozinku.'
  if (password.length < 8) return 'Lozinka mora imati najmanje 8 karaktera.'
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  if (!hasLetter || !hasNumber) {
    return 'Lozinka mora sadržati bar jedno slovo i jedan broj.'
  }
  return ''
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string {
  if (!value.trim()) return 'Unesi email adresu.'
  if (!EMAIL_RE.test(value.trim())) return 'Unesi ispravnu email adresu.'
  return ''
}
