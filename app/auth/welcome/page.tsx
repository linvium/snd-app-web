'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheckBigIcon, CrosshairIcon, ShieldCheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { AddressSearchField } from '@/components/location/AddressSearchField'
import { useAddLocation, useCurrentUser, useUpdateProfile } from '@/hooks/user'
import { SETTINGS_VERIFICATION } from '@/lib/profiles'
import { cn } from '@/lib/utils'

interface Place {
  street: string
  city: string
  postalCode: string | null
  lat: number
  lng: number
}

type Step = 1 | 2 | 3

const NAME_MAX = 100

export default function WelcomeOnboardingPage() {
  const router = useRouter()
  const updateProfile = useUpdateProfile()
  const addLocation = useAddLocation()
  const { data: currentUser } = useCurrentUser()

  const [step, setStep] = useState<Step>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [addressText, setAddressText] = useState('')
  const [place, setPlace] = useState<Place | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  const isSaving = updateProfile.isPending || addLocation.isPending

  // Someone arriving with a name already on the profile (e.g. a social sign-in)
  // sees it filled in rather than being asked again.
  useEffect(() => {
    const profile = currentUser?.user_profiles
    if (!profile) return
    setFirstName((current) => current || profile.first_name || '')
    setLastName((current) => current || profile.last_name || '')
  }, [currentUser])

  const requestGeolocation = () => {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace({
          street: 'Moja trenutna lokacija',
          city: 'Srbija',
          postalCode: null,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        setAddressText('Moja trenutna lokacija')
        setErrors((current) => ({ ...current, address: '' }))
        setGeoLoading(false)
      },
      () => {
        setGeoLoading(false)
      }
    )
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = 'Unesi ime.'
    else if (firstName.trim().length > NAME_MAX) next.firstName = 'Ime ne može biti duže od 100 karaktera.'
    if (!lastName.trim()) next.lastName = 'Unesi prezime.'
    else if (lastName.trim().length > NAME_MAX) next.lastName = 'Prezime ne može biti duže od 100 karaktera.'
    if (addressText.trim() && !place) next.address = 'Izaberi adresu iz ponuđenih rezultata.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleContinue = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) return

    try {
      await updateProfile.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })

      if (place) {
        await addLocation.mutateAsync({
          label: 'Kuća',
          street: place.street,
          city: place.city,
          postal_code: place.postalCode ?? undefined,
          latitude: place.lat,
          longitude: place.lng,
          is_default: true,
        })
      }

      setStep(2)
    } catch {
      setFormError('Greška pri čuvanju. Pokušaj ponovo.')
    }
  }

  return (
    <div>
      <p className="mb-5 text-center text-[13px] font-medium text-muted-foreground" data-testid="onboarding-step">
        Korak {step} od 3
      </p>

      {step === 1 ? (
        <form onSubmit={handleContinue} className="flex flex-col gap-5">
          <div>
            <h1 className="mb-2 text-center text-2xl font-normal tracking-[-0.02em] text-card-foreground">
              Reci nam ko si
            </h1>
            <p className="m-0 text-center text-[15px] leading-normal text-muted-foreground">
              Ime i prezime vide ostali korisnici. Lokaciju možeš da dodaš i kasnije.
            </p>
          </div>

          <TextField
            label="Ime"
            name="first_name"
            autoComplete="given-name"
            autoFocus
            value={firstName}
            error={errors.firstName}
            disabled={isSaving}
            onChange={(e) => {
              setFirstName(e.target.value)
              if (errors.firstName) setErrors((current) => ({ ...current, firstName: '' }))
            }}
          />

          <TextField
            label="Prezime"
            name="last_name"
            autoComplete="family-name"
            value={lastName}
            error={errors.lastName}
            disabled={isSaving}
            onChange={(e) => {
              setLastName(e.target.value)
              if (errors.lastName) setErrors((current) => ({ ...current, lastName: '' }))
            }}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <AddressSearchField
                  id="onboarding-location"
                  label="Lokacija (opciono)"
                  value={addressText}
                  picked={place !== null}
                  error={errors.address}
                  disabled={isSaving}
                  placeholder="Ulica i broj"
                  onTextChange={(text) => {
                    setAddressText(text)
                    setPlace(null)
                    if (errors.address) setErrors((current) => ({ ...current, address: '' }))
                  }}
                  onPick={(hit) => {
                    setAddressText(hit.label)
                    setPlace({
                      street: hit.street,
                      city: hit.city,
                      postalCode: hit.postal_code ?? null,
                      lat: hit.latitude,
                      lng: hit.longitude,
                    })
                  }}
                />
              </div>
              <button
                type="button"
                aria-label="Koristi moju lokaciju"
                title="Koristi moju lokaciju"
                disabled={isSaving || geoLoading}
                onClick={requestGeolocation}
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-md border border-input bg-card',
                  'disabled:pointer-events-none disabled:opacity-50',
                  place ? 'text-brand-600' : 'text-foreground'
                )}
              >
                <CrosshairIcon className="size-5" strokeWidth={1.8} />
              </button>
            </div>
            <p className="m-0 text-[13px] text-muted-foreground">
              Da bismo ti pokazali stvari blizu tebe.
            </p>
          </div>

          {formError ? (
            <p className="m-0 text-center text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <Button type="submit" fullWidth size="lg" loading={isSaving} disabled={isSaving}>
            Nastavi
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="text-center">
          <div
            className="mx-auto mb-5 grid size-12 place-items-center rounded-lg bg-brand-50 text-brand-600"
            aria-hidden
          >
            <ShieldCheckIcon className="size-7" strokeWidth={1.8} />
          </div>
          <h1 className="mb-2 text-2xl font-normal tracking-[-0.02em] text-card-foreground">
            Želiš da potvrdiš identitet?
          </h1>
          <p className="mb-7 text-[15px] leading-normal text-muted-foreground">
            Potrebna ti je lična karta, pasoš ili vozačka dozvola i kamera. Traje nekoliko minuta, a
            profil dobija oznaku potvrđenog identiteta. Možeš i kasnije.
          </p>
          <div className="flex flex-col gap-3">
            <Button type="button" fullWidth size="lg" onClick={() => router.push(SETTINGS_VERIFICATION)}>
              Da, potvrdi identitet
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={() => setStep(3)}>
              Ne, preskoči za sada
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="text-center">
          <div
            className="mx-auto mb-5 grid size-12 place-items-center rounded-lg bg-success-soft text-success"
            aria-hidden
          >
            <CircleCheckBigIcon className="size-7" strokeWidth={1.8} />
          </div>
          <h1 className="mb-2 text-2xl font-normal tracking-[-0.02em] text-card-foreground">
            Dobro došao na SND
          </h1>
          <p className="mb-7 text-[15px] leading-normal text-muted-foreground">
            Sve je spremno. Pogledaj svoj profil i počni da koristiš SND.
          </p>
          <Button type="button" fullWidth size="lg" onClick={() => router.push('/profile')}>
            Počni
          </Button>
        </div>
      ) : null}
    </div>
  )
}
