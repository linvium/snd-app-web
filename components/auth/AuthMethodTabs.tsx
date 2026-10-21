'use client'

import { cn } from '@/lib/utils'

export type AuthMethod = 'email' | 'phone'

export function AuthMethodTabs({
  value,
  onChange,
  disabled,
}: {
  value: AuthMethod
  onChange: (method: AuthMethod) => void
  disabled?: boolean
}) {
  return (
    <div
      role="tablist"
      aria-label="Način prijave"
      className="mb-1 grid grid-cols-2 gap-1 rounded-md border border-input bg-muted p-1"
    >
      {(
        [
          { method: 'email', label: 'Email' },
          { method: 'phone', label: 'Telefon' },
        ] as const
      ).map((tab) => (
        <button
          key={tab.method}
          type="button"
          role="tab"
          aria-selected={value === tab.method}
          disabled={disabled}
          onClick={() => onChange(tab.method)}
          className={cn(
            'h-9 rounded-[5px] text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
            value === tab.method
              ? 'bg-card text-card-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
