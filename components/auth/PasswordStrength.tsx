'use client'

import { getPasswordStrength } from '@/lib/auth-validation'

interface PasswordStrengthProps {
  password: string
}

const STRENGTH_MAP = {
  weak: { level: 1, label: 'Slaba', color: 'var(--color-error)' },
  medium: { level: 2, label: 'Srednja', color: 'var(--color-warning)' },
  strong: { level: 3, label: 'Jaka', color: 'var(--color-success)' },
} as const

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null

  const strength = getPasswordStrength(password)
  const { level, label, color } = STRENGTH_MAP[strength]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: 'var(--radius-full)',
              background: i <= level ? color : 'var(--color-gray-200)',
            }}
          />
        ))}
      </div>
      <p style={{ margin: 0, fontSize: '13px', color }}>{label}</p>
    </div>
  )
}
