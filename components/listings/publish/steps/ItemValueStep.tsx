'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CircleAlertIcon } from 'lucide-react'

export function ItemValueStep({
  value,
  error,
  warning,
  locked,
  onChange,
}: {
  value: string
  error?: string
  warning?: string
  locked?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="flex max-w-sm flex-col gap-1.5">
      <Label htmlFor="item-value">Koliko predmet vredi? (opciono)</Label>
      <div className="relative">
        <Input
          id="item-value"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          aria-invalid={error ? true : undefined}
          disabled={locked}
          className="pr-14"
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-foreground">
          RSD
        </span>
      </div>
      <p className="m-0 text-[13px] text-muted-foreground">
        Ako bi ga danas prodao na, recimo, KP-u - koliko bi tražio?
      </p>
      {error ? (
        <p className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
          <CircleAlertIcon className="size-3.5" aria-hidden />
          {error}
        </p>
      ) : warning ? (
        <p className="m-0 text-[13px] text-warning">{warning}</p>
      ) : null}
      {locked ? (
        <p className="m-0 text-[13px] text-muted-foreground" data-testid="locked-field-notice">
          Ne može se menjati dok traje aktivna rezervacija.
        </p>
      ) : null}
    </div>
  )
}
