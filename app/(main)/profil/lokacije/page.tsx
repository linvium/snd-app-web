'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AddLocationForm from '@/components/profil/AddLocationForm'
import {
  useDeleteLocation,
  useLocations,
  useSetDefaultLocation,
} from '@/hooks/user/useLocation'
import { locationIcon } from '@/lib/profileHelpers'
import { cn } from '@/lib/utils'
import type { SndLocation } from '@/types'

export default function LocationsPage() {
  const { data: locations = [], isLoading } = useLocations()
  const deleteLocation = useDeleteLocation()
  const setDefaultLocation = useSetDefaultLocation()
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState('')
  const [pendingDefaultId, setPendingDefaultId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const atLimit = locations.length >= 10

  const handleSetDefault = async (locationId: string) => {
    setActionError('')
    setPendingDefaultId(locationId)
    try {
      await setDefaultLocation.mutateAsync(locationId)
    } catch (err) {
      setActionError((err as Error)?.message || 'Greška pri postavljanju podrazumevane lokacije.')
    } finally {
      setPendingDefaultId(null)
    }
  }

  const handleDelete = async (location: SndLocation) => {
    if (!window.confirm('Obrisati ovu lokaciju?')) return
    setActionError('')
    setPendingDeleteId(location.id)
    try {
      await deleteLocation.mutateAsync(location.id)
    } catch (err) {
      setActionError((err as Error)?.message || 'Greška pri brisanju lokacije.')
    } finally {
      setPendingDeleteId(null)
    }
  }

  if (isLoading) {
    return <div className="py-6 text-sm text-muted-foreground">Učitavanje…</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 hidden text-[22px] font-normal text-foreground lg:block">Moje lokacije</h1>

      {locations.length === 0 && !showForm ? (
        <section className="rounded-xl border border-border bg-card px-5 py-8 text-center">
          <p className="mb-2 text-base font-semibold text-foreground">
            Još nemaš sačuvanih lokacija.
          </p>
          <p className="mb-5 text-sm text-muted-foreground">
            Lokacije koristiš kada objavljuješ predmet i kada se dogovaraš oko preuzimanja.
          </p>
          <Button onClick={() => setShowForm(true)}>+ Dodaj prvu lokaciju</Button>
        </section>
      ) : null}

      {locations.length > 0 ? (
        <ul className="m-0 list-none overflow-hidden rounded-xl border border-border bg-card p-0">
          {locations.map((location, index) => (
            <li
              key={location.id}
              className={cn('p-4', index > 0 && 'border-t border-border')}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-2.5">
                  <span aria-hidden className="text-xl leading-tight">
                    {locationIcon(location.label)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="m-0 text-[15px] font-semibold text-foreground">
                        {location.label}
                      </p>
                      {location.is_default ? (
                        <Badge className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
                          Podrazumevana
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 mb-0 text-[13px] text-muted-foreground">
                      {location.street}, {location.city}
                      {location.postal_code ? ` ${location.postal_code}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {!location.is_default ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={pendingDefaultId === location.id}
                    disabled={pendingDeleteId === location.id}
                    onClick={() => handleSetDefault(location.id)}
                  >
                    Postavi
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  loading={pendingDeleteId === location.id}
                  disabled={pendingDefaultId === location.id}
                  onClick={() => handleDelete(location)}
                >
                  Obriši
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {showForm ? (
        <AddLocationForm
          onCancel={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      ) : locations.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Button fullWidth disabled={atLimit} onClick={() => setShowForm(true)}>
            + Dodaj lokaciju
          </Button>
          {atLimit ? (
            <p className="m-0 text-center text-[13px] text-muted-foreground">10/10 lokacija</p>
          ) : null}
        </div>
      ) : null}

      {actionError ? (
        <p className="m-0 text-center text-sm text-destructive">{actionError}</p>
      ) : null}
    </div>
  )
}
