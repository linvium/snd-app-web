'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TextField } from '@/components/ui/text-field'
import { useAddLocation } from '@/hooks/user'
import { AddressSearchField } from '@/components/location/AddressSearchField'
import type { SndLocation } from '@/types/user'

const LocationPickerMap = dynamic(
  () => import('./LocationPickerMap').then((mod) => mod.LocationPickerMap),
  { ssr: false }
)

export function AddLocationModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (location: SndLocation) => void
}) {
  const addLocation = useAddLocation()
  const [label, setLabel] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [picked, setPicked] = useState(false)

  useEffect(() => {
    if (!open) {
      setLabel('')
      setStreet('')
      setCity('')
      setPostalCode('')
      setLat(null)
      setLng(null)
      setErrors({})
      setPicked(false)
    }
  }, [open])

  const submit = async () => {
    const next: Record<string, string> = {}
    if (label.trim().length < 2) next.label = 'Unesi naziv lokacije.'
    if (street.trim().length < 5) next.street = 'Unesi ulicu i broj.'
    if (!city.trim()) next.city = 'Unesi grad.'
    if (lat == null || lng == null) next.coords = 'Označi mesto na mapi.'
    setErrors(next)
    if (Object.keys(next).length > 0 || lat == null || lng == null) return

    try {
      const created = await addLocation.mutateAsync({
        label: label.trim(),
        street: street.trim(),
        city: city.trim(),
        postal_code: postalCode.trim() || undefined,
        latitude: lat,
        longitude: lng,
      })
      onCreated(created)
      onOpenChange(false)
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Nismo mogli da sačuvamo lokaciju.' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj lokaciju</DialogTitle>
          <DialogDescription>
            Tačna adresa ostaje privatna dok ne prihvatiš zahtev za rezervaciju.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <TextField
            label="Naziv"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="npr. Kuća, Posao, Vikendica"
            error={errors.label}
          />

          <AddressSearchField
            id="location-address"
            value={street}
            picked={picked}
            error={errors.street}
            onTextChange={(text) => {
              setPicked(false)
              setStreet(text)
            }}
            onPick={(hit) => {
              setPicked(true)
              setStreet(hit.street)
              setCity(hit.city)
              setPostalCode(hit.postal_code ?? '')
              setLat(hit.latitude)
              setLng(hit.longitude)
            }}
          />

          <TextField
            id="location-city"
            label="Grad"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            error={errors.city}
          />
          <TextField
            label="Poštanski broj (opciono)"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
          />

          <LocationPickerMap
            coordinates={lat != null && lng != null ? { lat, lng } : null}
            onChange={(coords) => {
              setLat(coords.lat)
              setLng(coords.lng)
            }}
          />
          {errors.coords ? <p className="m-0 text-[13px] text-destructive">{errors.coords}</p> : null}
          {errors.form ? <p className="m-0 text-[13px] text-destructive">{errors.form}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Otkaži
          </Button>
          <Button type="button" onClick={() => void submit()} loading={addLocation.isPending}>
            Sačuvaj lokaciju
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
