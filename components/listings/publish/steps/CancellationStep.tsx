'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CANCELLATION_COPY } from '@/lib/listings'
import type { CancellationPolicy } from '@/types/listing'
import { cn } from '@/lib/utils'

export function CancellationStep({
  value,
  locked,
  onChange,
}: {
  value: CancellationPolicy
  locked?: boolean
  onChange: (value: CancellationPolicy) => void
}) {
  const selected = CANCELLATION_COPY[value]

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as CancellationPolicy)}
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        disabled={locked}
        data-testid="cancellation-group"
      >
        {(Object.keys(CANCELLATION_COPY) as CancellationPolicy[]).map((key) => (
          <label
            key={key}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5',
              value === key && 'border-brand-500 bg-brand-50',
              locked && 'cursor-not-allowed opacity-70'
            )}
          >
            <RadioGroupItem value={key} />
            <span className="text-sm font-medium">{CANCELLATION_COPY[key].label}</span>
          </label>
        ))}
      </RadioGroup>

      <ul className="m-0 list-disc space-y-1 pl-5 text-[13px] leading-5 text-muted-foreground">
        {selected.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="m-0 text-[13px] text-muted-foreground">
        Fleksibilni uslovi donose više rezervacija. Strogi uslovi te bolje štite.
      </p>
      {locked ? (
        <p className="m-0 text-[13px] text-muted-foreground" data-testid="locked-field-notice">
          Ne može se menjati dok traje aktivna rezervacija.
        </p>
      ) : null}
    </div>
  )
}
