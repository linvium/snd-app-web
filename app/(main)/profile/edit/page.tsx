'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextField } from '@/components/ui/text-field'
import { useCurrentUser, useLocations, useUpdateProfile } from '@/hooks/user'
import {
  isValidSerbianPhone,
  normalizePhone,
  phoneLocalPart,
} from '@/lib/profiles'
import { cn } from '@/lib/utils'

export default function EditProfilePage() {
  const router = useRouter()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const updateProfile = useUpdateProfile()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [about, setAbout] = useState('')
  const [primaryLocationId, setPrimaryLocationId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    if (!user?.user_profiles) return
    const profile = user.user_profiles
    setFirstName(profile.first_name ?? '')
    setLastName(profile.last_name ?? '')
    setDisplayName(profile.display_name ?? '')
    setPhone(phoneLocalPart(profile.phone))
    setAbout(profile.about ?? '')
    setPrimaryLocationId(profile.primary_location_id ?? '')
  }, [user])

  const suggestedDisplayName = (() => {
    const first = firstName.trim()
    const last = lastName.trim()
    if (first && last) return `${first} ${last.charAt(0).toUpperCase()}.`
    if (first) return first
    return ''
  })()

  const validate = () => {
    const next: Record<string, string> = {}
    if (firstName.length > 100) next.firstName = 'Ime ne može biti duže od 100 karaktera.'
    if (lastName.length > 100) next.lastName = 'Prezime ne može biti duže od 100 karaktera.'
    if (displayName.length > 120) next.displayName = 'Prikazano ime ne može biti duže od 120 karaktera.'
    if (about.length > 1000) next.about = 'Tekst o meni ne može biti duži od 1000 karaktera.'

    const trimmedPhone = phone.trim()
    if (trimmedPhone) {
      const normalized = normalizePhone(trimmedPhone)
      if (!isValidSerbianPhone(normalized)) {
        next.phone = 'Unesi ispravan broj telefona.'
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavedMessage('')
    if (!validate()) return

    const normalizedPhone = phone.trim() ? normalizePhone(phone) : ''

    try {
      await updateProfile.mutateAsync({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        display_name: displayName.trim() || null,
        phone: normalizedPhone || null,
        about: about.trim() || null,
        primary_location_id: primaryLocationId || null,
      })
      setSavedMessage('Sačuvano')
      setTimeout(() => router.push('/profile'), 600)
    } catch {
      // error surfaced via updateProfile.isError
    }
  }

  if (userLoading || locationsLoading) {
    return <div className="py-6 text-sm text-muted-foreground">Učitavanje…</div>
  }

  return (
    <div>
      <h1 className="mb-6 hidden text-[22px] font-normal text-foreground lg:block">Izmeni profil</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        <TextField
          label="Ime"
          name="first_name"
          value={firstName}
          maxLength={100}
          error={errors.firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <TextField
          label="Prezime"
          name="last_name"
          value={lastName}
          maxLength={100}
          error={errors.lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <TextField
          label="Prikazano ime"
          name="display_name"
          value={displayName}
          maxLength={120}
          error={errors.displayName}
          helperText={
            suggestedDisplayName
              ? `Ako ostaviš prazno, prikazivaće se: '${suggestedDisplayName}'`
              : 'Ako ostaviš prazno, prikazivaće se ime iz naloga.'
          }
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <div className="flex w-full flex-col gap-1.5">
          <Label htmlFor="phone" className="text-sm font-medium text-foreground">
            Telefon
          </Label>
          <div className="flex gap-2">
            <span
              aria-hidden
              className="inline-flex h-11 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-[15px] font-semibold text-foreground"
            >
              +381
            </span>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              placeholder="641234567"
              aria-invalid={errors.phone ? true : undefined}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
              className="flex-1"
            />
          </div>
          {errors.phone ? (
            <p className="m-0 text-[13px] text-destructive">{errors.phone}</p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <Label htmlFor="about" className="text-sm font-medium text-foreground">
            O meni
          </Label>
          <textarea
            id="about"
            name="about"
            value={about}
            maxLength={1000}
            rows={5}
            aria-invalid={errors.about ? true : undefined}
            onChange={(e) => setAbout(e.target.value)}
            className={cn(
              'w-full resize-y rounded-md border border-input bg-card px-3.5 py-3 font-sans text-base leading-normal text-card-foreground outline-none transition-colors',
              'focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100',
              'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20'
            )}
          />
          <div className="flex justify-between gap-2">
            {errors.about ? (
              <p className="m-0 text-[13px] text-destructive">{errors.about}</p>
            ) : (
              <span />
            )}
            <p className="m-0 text-[13px] text-muted-foreground">{about.length}/1000</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <Label htmlFor="primary_location_id" className="text-sm font-medium text-foreground">
            Podrazumevana lokacija
          </Label>
          {locations.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">
              Najpre{' '}
              <Link href="/profile/locations" className="font-semibold text-brand-600">
                dodaj lokaciju
              </Link>
            </p>
          ) : (
            <select
              id="primary_location_id"
              name="primary_location_id"
              value={primaryLocationId}
              onChange={(e) => setPrimaryLocationId(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-card px-3.5 text-base text-card-foreground outline-none focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100"
            >
              <option value="">Nije izabrano</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label} — {location.street}, {location.city}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-3">
          <Button type="submit" fullWidth size="lg" loading={updateProfile.isPending}>
            Sačuvaj promene
          </Button>
          <Link
            href="/profile"
            className="p-2.5 text-center text-[15px] font-semibold text-muted-foreground"
          >
            Odustani
          </Link>
        </div>

        {savedMessage ? (
          <p className="m-0 text-center font-semibold text-success">{savedMessage}</p>
        ) : null}

        {updateProfile.isError ? (
          <p className="m-0 text-center text-sm text-destructive">
            {(updateProfile.error as Error)?.message || 'Greška pri čuvanju. Pokušaj ponovo.'}
          </p>
        ) : null}
      </form>
    </div>
  )
}
