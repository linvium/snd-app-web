'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/auth/PasswordInput'
import PasswordStrength from '@/components/auth/PasswordStrength'
import { useUpdatePassword } from '@/hooks/auth/useAuth'
import { validatePassword } from '@/lib/auth-validation'

export default function NewPasswordPage() {
  const updatePassword = useUpdatePassword()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPasswordError, setNewPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowErrors(true)

    const nextNewPasswordError = validatePassword(newPassword)
    const nextConfirmError =
      !confirmPassword
        ? 'Ponovi lozinku.'
        : newPassword !== confirmPassword
          ? 'Lozinke se ne poklapaju.'
          : ''

    setNewPasswordError(nextNewPasswordError)
    setConfirmError(nextConfirmError)
    if (nextNewPasswordError || nextConfirmError) return

    updatePassword.mutate({ password: newPassword })
  }

  return (
    <div>
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-gray-900)',
          letterSpacing: '-0.02em',
        }}
      >
        Nova lozinka
      </h1>
      <p style={{ margin: '0 0 28px', color: 'var(--color-gray-500)', fontSize: '15px' }}>
        Unesi novu lozinku za svoj nalog.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <PasswordInput
          label="Nova lozinka"
          name="new-password"
          autoComplete="new-password"
          autoFocus
          value={newPassword}
          error={newPasswordError}
          indicator={<PasswordStrength password={newPassword} />}
          onChange={(e) => {
            setNewPassword(e.target.value)
            if (showErrors || newPasswordError) {
              setNewPasswordError(validatePassword(e.target.value))
            }
            if (showErrors && confirmPassword) {
              setConfirmError(
                e.target.value !== confirmPassword ? 'Lozinke se ne poklapaju.' : ''
              )
            }
          }}
          onBlur={() => setNewPasswordError(validatePassword(newPassword))}
        />

        <PasswordInput
          label="Ponovi lozinku"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          error={confirmError}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (showErrors || confirmError) {
              setConfirmError(
                !e.target.value
                  ? 'Ponovi lozinku.'
                  : e.target.value !== newPassword
                    ? 'Lozinke se ne poklapaju.'
                    : ''
              )
            }
          }}
          onBlur={() =>
            setConfirmError(
              !confirmPassword
                ? 'Ponovi lozinku.'
                : confirmPassword !== newPassword
                  ? 'Lozinke se ne poklapaju.'
                  : ''
            )
          }
        />

        {updatePassword.isError ? (
          <p
            style={{
              margin: 0,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-error-soft)',
              color: 'var(--color-error)',
              fontSize: '14px',
            }}
          >
            Greška pri promeni lozinke. Pokušaj ponovo.
          </p>
        ) : null}

        <Button type="submit" fullWidth loading={updatePassword.isPending}>
          Sačuvaj lozinku
        </Button>
      </form>
    </div>
  )
}
