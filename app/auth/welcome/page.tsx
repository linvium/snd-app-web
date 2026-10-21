'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CrosshairIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneField } from '@/components/auth/PhoneField'
import { useAddLocation, useUpdateProfile } from '@/hooks/user'
import { normalizePhone, isValidSerbianPhone } from '@/lib/profiles'
import { cn } from '@/lib/utils'

export default function WelcomeOnboardingPage() {
  const router = useRouter()
  const updateProfile = useUpdateProfile()
  const addLocation = useAddLocation()

  const [phoneInput, setPhoneInput] = useState('')
  const [addressLabel, setAddressLabel] = useState('')
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [phoneError, setPhoneError] = useState('')
  const [formError, setFormError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  const isSaving = updateProfile.isPending || addLocation.isPending

  const requestGeolocation = () => {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setAddressLabel('Moja trenutna lokacija')
        setGeoLoading(false)
      },
      () => {
        setGeoLoading(false)
      }
    )
  }

  const handleSkip = () => {
    router.push('/')
  }

  const handleSave = async () => {
    setFormError('')
    setPhoneError('')

    const phone = phoneInput ? normalizePhone(phoneInput) : ''
    if (phone && !isValidSerbianPhone(phone)) {
      setPhoneError('Unesi ispravan broj telefona.')
      return
    }

    try {
      if (phone) {
        await updateProfile.mutateAsync({ phone })
      }

      if (coordinates) {
        await addLocation.mutateAsync({
          label: 'Kuća',
          street: addressLabel || 'Moja lokacija',
          city: 'Srbija',
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          is_default: true,
        })
      }

      router.push('/')
    } catch {
      setFormError('Greška pri čuvanju. Pokušaj ponovo.')
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-normal tracking-[-0.02em] text-card-foreground">
        Dobro došao na SND
      </h1>
      <p className="mb-7 text-center text-[15px] leading-normal text-muted-foreground">
        Dva podatka i spreman si. Možeš i da preskočiš - dodaćeš ih kasnije.
      </p>

      <div className="flex flex-col gap-5">
        <PhoneField
          id="onboarding-phone"
          value={phoneInput}
          disabled={isSaving}
          error={phoneError}
          helperText="Ne prikazuje se javno."
          onChange={(next) => {
            setPhoneInput(next)
            if (phoneError) setPhoneError('')
          }}
        />

        <div className="flex w-full flex-col gap-1.5">
          <Label htmlFor="onboarding-location" className="text-sm font-medium text-foreground">
            Lokacija
          </Label>
          <div className="flex gap-2">
            <Input
              id="onboarding-location"
              name="location"
              type="text"
              value={addressLabel}
              disabled={isSaving}
              placeholder="Ulica, grad"
              onChange={(e) => setAddressLabel(e.target.value)}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              aria-label="Koristi moju lokaciju"
              title="Koristi moju lokaciju"
              disabled={isSaving || geoLoading}
              onClick={requestGeolocation}
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-md border border-input bg-card',
                'disabled:pointer-events-none disabled:opacity-50',
                coordinates ? 'text-brand-600' : 'text-foreground'
              )}
            >
              <CrosshairIcon className="size-5" strokeWidth={1.8} />
            </button>
          </div>
          <p className="m-0 text-[13px] text-muted-foreground">
            Da bismo ti pokazali stvari blizu tebe.
          </p>
        </div>

        <div className="mt-1 flex flex-col gap-3">
          <Button
            type="button"
            fullWidth
            size="lg"
            loading={isSaving}
            disabled={isSaving}
            onClick={handleSave}
          >
            Sačuvaj i nastavi
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            disabled={isSaving}
            onClick={handleSkip}
          >
            Preskoči za sada
          </Button>
        </div>

        {formError ? (
          <p className="m-0 text-center text-sm text-destructive">{formError}</p>
        ) : null}
      </div>
    </div>
  )
}
