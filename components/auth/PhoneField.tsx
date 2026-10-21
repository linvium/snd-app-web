'use client'

import * as React from 'react'

import { Label } from '@/components/ui/label'
import { DEFAULT_PHONE_COUNTRY_CODE, PHONE_COUNTRY_CODES } from '@/lib/profiles'
import { cn } from '@/lib/utils'

export interface PhoneFieldProps {
  /** Local part only (e.g. "641234567"), without the calling code. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  /** Pass both to let the user pick a calling code; otherwise it is fixed. */
  countryCode?: string
  onCountryCodeChange?: (code: string) => void
  label?: string
  error?: string
  helperText?: string
  disabled?: boolean
  autoFocus?: boolean
  name?: string
  id?: string
}

export function PhoneField({
  value,
  onChange,
  onBlur,
  countryCode = DEFAULT_PHONE_COUNTRY_CODE,
  onCountryCodeChange,
  label = 'Telefon',
  error,
  helperText,
  disabled,
  autoFocus,
  name = 'phone',
  id = 'phone',
}: PhoneFieldProps) {
  const selectable = Boolean(onCountryCodeChange) && PHONE_COUNTRY_CODES.length > 1

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div
        className={cn(
          'flex h-11 items-center rounded-md border bg-card px-3.5 transition-colors',
          'focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-100',
          error ? 'border-destructive ring-3 ring-destructive/20' : 'border-input'
        )}
      >
        {selectable ? (
          <select
            aria-label="Pozivni broj"
            name={`${name}-country`}
            value={countryCode}
            disabled={disabled}
            onChange={(e) => onCountryCodeChange?.(e.target.value)}
            className="mr-1.5 h-full shrink-0 cursor-pointer border-none bg-transparent p-0 text-base text-muted-foreground outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            {PHONE_COUNTRY_CODES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.code} {country.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="mr-1.5 shrink-0 select-none text-base text-muted-foreground">
            {countryCode}
          </span>
        )}
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          value={value}
          disabled={disabled}
          placeholder="641234567"
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={onBlur}
          className="h-full min-w-0 flex-1 border-none bg-transparent p-0 text-base text-card-foreground outline-none disabled:pointer-events-none disabled:opacity-50"
        />
      </div>
      {error ? (
        <p className="m-0 text-[13px] text-destructive">{error}</p>
      ) : helperText ? (
        <p className="m-0 text-[13px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  )
}
