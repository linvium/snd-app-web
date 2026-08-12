'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
      <h1 className="mb-2 text-2xl font-bold tracking-[-0.02em] text-card-foreground">
        Nova lozinka
      </h1>
      <p className="mb-7 text-[15px] text-muted-foreground">
        Unesi novu lozinku za svoj nalog.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          <p className="m-0 rounded-md bg-red-50 px-3.5 py-3 text-sm text-destructive">
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
