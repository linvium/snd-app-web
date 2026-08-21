'use client'

import { Loader2Icon, PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { SndLocation } from '@/types/user'

export function LocationsStep({
  locations,
  selectedIds,
  error,
  loading,
  onToggle,
  onAdd,
}: {
  locations: SndLocation[]
  selectedIds: string[]
  error?: string
  loading?: boolean
  onToggle: (id: string, checked: boolean) => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] leading-5 text-muted-foreground">
        Tačna adresa se ne prikazuje pre nego što rezervacija bude plaćena i potvrđena.{' '}
        {/* Opens in the support sheet over the half-filled form, rather than
            in the new tab this used to need. */}
        <a
          href="/support/pickup-and-return"
          data-testid="pickup-help-link"
          className="font-medium text-brand-700 no-underline hover:underline"
        >
          Više →
        </a>
      </p>

      {loading ? (
        <p className="m-0 flex items-center gap-2 text-[13px] text-muted-foreground" data-testid="locations-loading">
          <Loader2Icon className="size-4 animate-spin" />
          Učitavam lokacije…
        </p>
      ) : locations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center">
          <p className="m-0 text-sm font-medium text-card-foreground">Još nemaš nijednu lokaciju</p>
          <Button type="button" className="mt-3" onClick={onAdd}>
            Dodaj prvu lokaciju
          </Button>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {locations.map((location) => {
            const checked = selectedIds.includes(location.id)
            return (
              <li key={location.id}>
                <label
                  className="flex cursor-pointer gap-3 rounded-lg border border-border bg-card px-3 py-3"
                  data-testid="location-option"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => onToggle(location.id, value === true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium text-card-foreground">{location.label}</span>
                    <span className="block text-[13px] text-muted-foreground">
                      {location.street}, {location.city}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {locations.length > 0 ? (
        <Button type="button" variant="ghost" className="w-fit px-0" onClick={onAdd}>
          <PlusIcon className="size-4" />
          Dodaj lokaciju
        </Button>
      ) : null}

      {error ? <p className="m-0 text-[13px] text-destructive">{error}</p> : null}
    </div>
  )
}
