'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextField } from '@/components/ui/text-field'
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
      className="flex flex-col gap-4 rounded-lg border border-border bg-muted p-4"
    >
      <TextField
        label="Naziv lokacije"
        name="label"
        value={label}
        maxLength={60}
        placeholder="Kuća, Posao, Vikendica"
        error={errors.label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <TextField
        label="Ulica i broj"
        name="street"
        value={street}
        maxLength={200}
        error={errors.street}
        onChange={(e) => setStreet(e.target.value)}
      />

      <div className="flex w-full flex-col gap-1.5">
        <Label htmlFor="city" className="text-sm font-medium text-foreground">
          Grad
        </Label>
        <Input
          id="city"
          name="city"
          list="gradovi"
          value={city}
          aria-invalid={errors.city ? true : undefined}
          onChange={(e) => setCity(e.target.value)}
        />
        <datalist id="gradovi">
          {SERBIAN_CITIES.map((cityName) => (
            <option key={cityName} value={cityName} />
          ))}
        </datalist>
        {errors.city ? (
          <p className="m-0 text-[13px] text-destructive">{errors.city}</p>
        ) : null}
      </div>

      <TextField
        label="Poštanski broj"
        name="postal_code"
        value={postalCode}
        maxLength={5}
        inputMode="numeric"
        error={errors.postalCode}
        onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
      />

      <div className="flex flex-col gap-2.5">
        <p className="m-0 text-sm font-medium text-foreground">Koordinate</p>

        {!manualCoords ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              loading={geoLoading}
              onClick={requestGeolocation}
            >
              Koristi moju lokaciju
            </Button>
            {hasCoords ? (
              <p className="m-0 text-[13px] text-success">
                Lokacija preuzeta ({latitude!.toFixed(5)}, {longitude!.toFixed(5)})
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setManualCoords(true)}
              className="cursor-pointer self-start border-0 bg-transparent p-0 text-[13px] font-semibold text-brand-600"
            >
              Unesi ručno
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <TextField
              label="Geografska širina"
              name="latitude"
              value={latInput}
              inputMode="decimal"
              onChange={(e) => setLatInput(e.target.value)}
            />
            <TextField
              label="Geografska dužina"
              name="longitude"
              value={lngInput}
              inputMode="decimal"
              onChange={(e) => setLngInput(e.target.value)}
            />
            <button
              type="button"
              onClick={requestGeolocation}
              className="cursor-pointer self-start border-0 bg-transparent p-0 text-[13px] font-semibold text-brand-600"
            >
              Koristi moju lokaciju
            </button>
          </div>
        )}

        <p className="m-0 text-xs text-muted-foreground">
          Koordinate se koriste za prikaz na mapi. Tačna adresa se ne prikazuje javno.
        </p>
        {errors.coords ? (
          <p className="m-0 text-[13px] text-destructive">{errors.coords}</p>
        ) : null}
      </div>

      <div className="mt-1 flex flex-col gap-2.5">
        <Button type="submit" fullWidth loading={addLocation.isPending}>
          Sačuvaj lokaciju
        </Button>
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={onCancel}
          disabled={addLocation.isPending}
        >
          Otkaži
        </Button>
      </div>

      {formError ? (
        <p className="m-0 text-center text-sm text-destructive">{formError}</p>
      ) : null}
    </form>
  )
}
