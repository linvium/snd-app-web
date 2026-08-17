'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatRsdAmount, savingsForPackage } from '@/lib/listings'
import { formatPriceMinor } from '@/lib/search/search.helpers'
import type { PriceSuggestion } from '@/types/listing'
import { CircleAlertIcon } from 'lucide-react'

function PriceField({
  id,
  label,
  optional,
  value,
  error,
  savings,
  onChange,
}: {
  id: string
  label: string
  optional?: boolean
  value: string
  error?: string
  savings?: string | null
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground"> (opciono)</span> : null}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          aria-invalid={error ? true : undefined}
          className="pr-14"
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-foreground">
          RSD
        </span>
      </div>
      {error ? (
        <p className="m-0 flex items-start gap-1.5 text-[13px] text-destructive">
          <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : savings ? (
        <p className="m-0 text-[13px] text-muted-foreground">{savings}</p>
      ) : null}
    </div>
  )
}

export function PriceStep({
  price1,
  price3,
  price7,
  errors,
  suggestion,
  categoryName,
  onChange,
  onApplySuggestion,
}: {
  price1: string
  price3: string
  price7: string
  errors: { price1?: string; price3?: string; price7?: string }
  suggestion: PriceSuggestion | null | undefined
  categoryName?: string
  onChange: (field: 'price1' | 'price3' | 'price7', value: string) => void
  onApplySuggestion: () => void
}) {
  const daily = price1 ? Number(price1) : null
  const pack3 = price3 ? Number(price3) : null
  const pack7 = price7 ? Number(price7) : null
  const save3 = daily && pack3 ? savingsForPackage(daily, pack3, 3) : null
  const save7 = daily && pack7 ? savingsForPackage(daily, pack7, 7) : null

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[13px] leading-5 text-muted-foreground">
        Za duže iznajmljivanje možeš dati nižu cenu. Sistem uvek naplaćuje najpovoljniju kombinaciju.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <PriceField
          id="price-1"
          label="Cena za 1 dan"
          value={price1}
          error={errors.price1}
          onChange={(value) => onChange('price1', value)}
        />
        <PriceField
          id="price-3"
          label="Cena za 3 dana"
          optional
          value={price3}
          error={errors.price3}
          savings={
            save3
              ? `→ ${formatRsdAmount(save3.perDayRsd)} po danu · ušteda ${save3.percent}%`
              : null
          }
          onChange={(value) => onChange('price3', value)}
        />
        <PriceField
          id="price-7"
          label="Cena za 7 dana"
          optional
          value={price7}
          error={errors.price7}
          savings={
            save7
              ? `→ ${formatRsdAmount(save7.perDayRsd)} po danu · ušteda ${save7.percent}%`
              : null
          }
          onChange={(value) => onChange('price7', value)}
        />
      </div>

      {suggestion ? (
        <div className="rounded-xl border border-border bg-muted/60 p-4">
          <p className="m-0 text-sm font-semibold text-card-foreground">
            Predlog cene{categoryName ? ` za ${categoryName}` : ''}
          </p>
          <dl className="mt-3 mb-3 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
            <dt>1 dan</dt>
            <dd className="m-0 font-medium">{formatPriceMinor(suggestion.price_1_day_minor)}</dd>
            <dt>3 dana</dt>
            <dd className="m-0 font-medium">{formatPriceMinor(suggestion.price_3_days_minor)}</dd>
            <dt>7 dana</dt>
            <dd className="m-0 font-medium">{formatPriceMinor(suggestion.price_7_days_minor)}</dd>
          </dl>
          <p className="m-0 text-[13px] text-muted-foreground">
            {suggestion.source === 'median'
              ? `Zasnovano na ${suggestion.sample_size} slična oglasa.`
              : 'Zasnovano na uobičajenim cenama za ovu kategoriju.'}
          </p>
          <Button type="button" className="mt-3 bg-brand-500 hover:bg-brand-600" onClick={onApplySuggestion}>
            Koristi predložene cene
          </Button>
        </div>
      ) : null}
    </div>
  )
}
