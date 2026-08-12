'use client'

import { getPasswordStrength } from '@/lib/auth-validation'
import { cn } from '@/lib/utils'

interface PasswordStrengthProps {
  password: string
}

const STRENGTH_MAP = {
  weak: { level: 1, label: 'Slaba', barClass: 'bg-destructive', textClass: 'text-destructive' },
  medium: { level: 2, label: 'Srednja', barClass: 'bg-warning', textClass: 'text-warning' },
  strong: { level: 3, label: 'Jaka', barClass: 'bg-success', textClass: 'text-success' },
} as const

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null

  const strength = getPasswordStrength(password)
  const { level, label, barClass, textClass } = STRENGTH_MAP[strength]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              i <= level ? barClass : 'bg-zinc-200'
            )}
          />
        ))}
      </div>
      <p className={cn('m-0 text-[13px]', textClass)}>{label}</p>
    </div>
  )
}
