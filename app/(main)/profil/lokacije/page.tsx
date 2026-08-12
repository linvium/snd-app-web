'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import AddLocationForm from '@/components/profil/AddLocationForm'
import {
  useDeleteLocation,
  useLocations,
  useSetDefaultLocation,
} from '@/hooks/user/useLocation'
import { locationIcon } from '@/lib/profileHelpers'
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
    return (
      <div style={{ padding: '24px 0', color: 'var(--color-gray-500)', fontSize: '14px' }}>
        Učitavanje…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1
        className="snd-profile-page-title"
        style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--color-gray-900)',
        }}
      >
        Moje lokacije
      </h1>

      {locations.length === 0 && !showForm ? (
        <section
          style={{
            padding: '32px 20px',
            textAlign: 'center',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-gray-200)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-gray-900)',
            }}
          >
            Još nemaš sačuvanih lokacija.
          </p>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--color-gray-500)' }}>
            Lokacije koristiš kada objavljuješ predmet i kada se dogovaraš oko preuzimanja.
          </p>
          <Button onClick={() => setShowForm(true)}>+ Dodaj prvu lokaciju</Button>
        </section>
      ) : null}

      {locations.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-gray-200)',
            overflow: 'hidden',
          }}
        >
          {locations.map((location, index) => (
            <li
              key={location.id}
              style={{
                padding: '16px',
                borderTop: index === 0 ? 'none' : '1px solid var(--color-gray-200)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', minWidth: 0 }}>
                  <span aria-hidden style={{ fontSize: '20px', lineHeight: 1.2 }}>
                    {locationIcon(location.label)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--color-gray-900)',
                        }}
                      >
                        {location.label}
                      </p>
                      {location.is_default ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-brand-600)',
                            background: 'var(--color-brand-50)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          Podrazumevana
                        </span>
                      ) : null}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-gray-500)' }}>
                      {location.street}, {location.city}
                      {location.postal_code ? ` ${location.postal_code}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button
            fullWidth
            disabled={atLimit}
            onClick={() => setShowForm(true)}
          >
            + Dodaj lokaciju
          </Button>
          {atLimit ? (
            <p style={{ margin: 0, textAlign: 'center', fontSize: '13px', color: 'var(--color-gray-500)' }}>
              10/10 lokacija
            </p>
          ) : null}
        </div>
      ) : null}

      {actionError ? (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-error)', textAlign: 'center' }}>
          {actionError}
        </p>
      ) : null}
    </div>
  )
}
