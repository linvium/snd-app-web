'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAddLocation } from '@/hooks/user/useLocation'
import { SERBIAN_CITIES } from '@/lib/profileHelpers'

interface AddLocationFormProps {
  onCancel: () => void
  onSuccess?: () => void
}

export default function AddLocationForm({ onCancel, onSuccess }: AddLocationFormProps) {
  const addLocation = useAddLocation()

  const [label, setLabel] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [manualCoords, setManualCoords] = useState(false)
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setManualCoords(true)
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setLatInput(String(pos.coords.latitude))
        setLngInput(String(pos.coords.longitude))
        setManualCoords(false)
        setGeoLoading(false)
        setErrors((prev) => {
          const next = { ...prev }
          delete next.coords
          return next
        })
      },
      () => {
        setManualCoords(true)
        setGeoLoading(false)
      }
    )
  }

  const validate = () => {
    const next: Record<string, string> = {}
    const trimmedLabel = label.trim()
    const trimmedStreet = street.trim()
    const trimmedCity = city.trim()

    if (trimmedLabel.length < 2 || trimmedLabel.length > 60) {
      next.label = 'Naziv mora imati između 2 i 60 karaktera.'
    }
    if (trimmedStreet.length < 5 || trimmedStreet.length > 200) {
      next.street = 'Unesi ulicu i broj.'
    }
    if (!trimmedCity) {
      next.city = 'Unesi grad.'
    }
    if (postalCode && !/^\d{5}$/.test(postalCode.trim())) {
      next.postalCode = 'Poštanski broj mora imati 5 cifara.'
    }

    let lat = latitude
    let lng = longitude
    if (manualCoords) {
      lat = Number(latInput)
      lng = Number(lngInput)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        next.coords = 'Potrebne su koordinate lokacije.'
      }
    } else if (lat == null || lng == null) {
      next.coords = 'Potrebne su koordinate lokacije.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    const lat = manualCoords ? Number(latInput) : latitude
    const lng = manualCoords ? Number(lngInput) : longitude
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setErrors((prev) => ({ ...prev, coords: 'Potrebne su koordinate lokacije.' }))
      return
    }

    try {
      await addLocation.mutateAsync({
        label: label.trim(),
        street: street.trim(),
        city: city.trim(),
        postal_code: postalCode.trim() || undefined,
        latitude: lat,
        longitude: lng,
      })
      onSuccess?.()
    } catch (err) {
      setFormError((err as Error)?.message || 'Greška pri čuvanju lokacije.')
    }
  }

  const hasCoords = latitude != null && longitude != null

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        background: 'var(--color-gray-50)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-gray-200)',
      }}
    >
      <Input
        label="Naziv lokacije"
        name="label"
        value={label}
        maxLength={60}
        placeholder="Kuća, Posao, Vikendica"
        error={errors.label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <Input
        label="Ulica i broj"
        name="street"
        value={street}
        maxLength={200}
        error={errors.street}
        onChange={(e) => setStreet(e.target.value)}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        <label
          htmlFor="city"
          style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-gray-700)' }}
        >
          Grad
        </label>
        <input
          id="city"
          name="city"
          list="gradovi"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{
            width: '100%',
            height: '44px',
            padding: '0 14px',
            fontSize: '16px',
            color: 'var(--color-gray-900)',
            background: 'var(--color-white)',
            border: `1px solid ${errors.city ? 'var(--color-error)' : 'var(--color-gray-300)'}`,
            borderRadius: 'var(--radius-md)',
          }}
        />
        <datalist id="gradovi">
          {SERBIAN_CITIES.map((cityName) => (
            <option key={cityName} value={cityName} />
          ))}
        </datalist>
        {errors.city ? (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{errors.city}</p>
        ) : null}
      </div>

      <Input
        label="Poštanski broj"
        name="postal_code"
        value={postalCode}
        maxLength={5}
        inputMode="numeric"
        error={errors.postalCode}
        onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--color-gray-700)' }}>
          Koordinate
        </p>

        {!manualCoords ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              loading={geoLoading}
              onClick={requestGeolocation}
            >
              Koristi moju lokaciju
            </Button>
            {hasCoords ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-success)' }}>
                Lokacija preuzeta ({latitude!.toFixed(5)}, {longitude!.toFixed(5)})
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setManualCoords(true)}
              style={{
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                padding: 0,
                color: 'var(--color-brand-600)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Unesi ručno
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label="Geografska širina"
              name="latitude"
              value={latInput}
              inputMode="decimal"
              onChange={(e) => setLatInput(e.target.value)}
            />
            <Input
              label="Geografska dužina"
              name="longitude"
              value={lngInput}
              inputMode="decimal"
              onChange={(e) => setLngInput(e.target.value)}
            />
            <button
              type="button"
              onClick={requestGeolocation}
              style={{
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                padding: 0,
                color: 'var(--color-brand-600)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Koristi moju lokaciju
            </button>
          </div>
        )}

        <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-gray-500)' }}>
          Koordinate se koriste za prikaz na mapi. Tačna adresa se ne prikazuje javno.
        </p>
        {errors.coords ? (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{errors.coords}</p>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        <Button type="submit" fullWidth loading={addLocation.isPending}>
          Sačuvaj lokaciju
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={addLocation.isPending}>
          Otkaži
        </Button>
      </div>

      {formError ? (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-error)', textAlign: 'center' }}>
          {formError}
        </p>
      ) : null}
    </form>
  )
}
