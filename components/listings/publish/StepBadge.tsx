import { CheckIcon, CircleAlertIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type StepBadgeState = 'empty' | 'active' | 'valid' | 'error'

export function StepBadge({
  index,
  state,
}: {
  index: number
  state: StepBadgeState
}) {
  return (
    <span
      data-testid={`step-badge-${index}`}
      data-state={state}
      aria-invalid={state === 'error' ? true : undefined}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
        state === 'empty' && 'border-zinc-300 bg-card text-zinc-500',
        state === 'active' && 'border-brand-500 bg-brand-500 text-white',
        state === 'valid' && 'border-success bg-success text-white',
        state === 'error' && 'border-destructive bg-destructive text-white'
      )}
      aria-hidden
    >
      {state === 'valid' ? (
        <CheckIcon className="size-4" strokeWidth={2.5} />
      ) : state === 'error' ? (
        <CircleAlertIcon className="size-4" strokeWidth={2.5} />
      ) : (
        index
      )}
    </span>
  )
}
