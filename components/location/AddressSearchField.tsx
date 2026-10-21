'use client'

import { useEffect, useState } from 'react'
import { Loader2Icon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { useGeocode } from '@/hooks/listings'
import type { GeocodeResult } from '@/types/listing'

/**
 * Street / place search with suggestions. The parent owns the text and whether
 * a suggestion has been picked: typing clears the pick (onTextChange), choosing
 * a suggestion sets it (onPick).
 */
export function AddressSearchField({
  id,
  label = 'Adresa',
  value,
  picked,
  error,
  disabled,
  placeholder = 'Ulica i broj',
  onTextChange,
  onPick,
}: {
  id: string
  label?: string
  value: string
  picked: boolean
  error?: string
  disabled?: boolean
  placeholder?: string
  onTextChange: (text: string) => void
  onPick: (hit: GeocodeResult) => void
}) {
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(value), 250)
    return () => window.clearTimeout(timer)
  }, [value])

  const geocode = useGeocode(debouncedQuery)
  const results = geocode.data ?? []
  const trimmedQuery = value.trim()
  const waitingForSearch =
    trimmedQuery.length >= 3 && (trimmedQuery !== debouncedQuery.trim() || geocode.isFetching)
  const showPopover = !picked && trimmedQuery.length >= 3

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={showPopover} modal={false}>
        <PopoverAnchor asChild>
          <Input
            id={id}
            value={value}
            disabled={disabled}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-autocomplete="list"
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="z-[60] w-[var(--radix-popover-anchor-width)] min-w-72 p-1"
        >
          {waitingForSearch && results.length === 0 ? (
            <p
              className="m-0 flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground"
              data-testid="geocode-loading"
            >
              <Loader2Icon className="size-3.5 animate-spin" />
              Tražim adrese…
            </p>
          ) : results.length > 0 ? (
            <ul className="m-0 max-h-48 list-none overflow-y-auto p-0" data-testid="geocode-results">
              {waitingForSearch ? (
                <li className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-muted-foreground">
                  <Loader2Icon className="size-3 animate-spin" />
                  Ažuriram…
                </li>
              ) : null}
              {results.map((hit) => (
                <li key={`${hit.latitude}-${hit.longitude}-${hit.label}`}>
                  <button
                    type="button"
                    data-testid="geocode-result"
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onPick(hit)}
                  >
                    {hit.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 px-3 py-2 text-[13px] text-muted-foreground" data-testid="geocode-empty">
              Nema rezultata. Probaj ulicu i broj, npr. Knez Mihailova 1.
            </p>
          )}
        </PopoverContent>
      </Popover>
      {error ? <p className="m-0 text-[13px] text-destructive">{error}</p> : null}
    </div>
  )
}
