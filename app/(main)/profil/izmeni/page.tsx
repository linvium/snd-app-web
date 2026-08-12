'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useCurrentUser, useUpdateProfile } from '@/hooks/user/useUser'
import { useLocations } from '@/hooks/user/useLocation'
import {
  isValidSerbianPhone,
  normalizePhone,
  phoneLocalPart,
} from '@/lib/profileHelpers'

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
  const [aboutFocused, setAboutFocused] = useState(false)

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
      setTimeout(() => router.push('/profil'), 600)
    } catch {
      // error surfaced via updateProfile.isError
    }
  }

  if (userLoading || locationsLoading) {
    return (
      <div style={{ padding: '24px 0', color: 'var(--color-gray-500)', fontSize: '14px' }}>
        Učitavanje…
      </div>
    )
  }

  return (
    <div>
      <h1
        className="snd-profile-page-title"
        style={{
          margin: '0 0 24px',
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--color-gray-900)',
        }}
      >
        Izmeni profil
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Input
          label="Ime"
          name="first_name"
          value={firstName}
          maxLength={100}
          error={errors.firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <Input
          label="Prezime"
          name="last_name"
          value={lastName}
          maxLength={100}
          error={errors.lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <Input
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          <label
            htmlFor="phone"
            style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-gray-700)' }}
          >
            Telefon
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span
              aria-hidden
              style={{
                height: '44px',
                padding: '0 12px',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-300)',
                background: 'var(--color-gray-100)',
                color: 'var(--color-gray-700)',
                fontWeight: 600,
                fontSize: '15px',
                flexShrink: 0,
              }}
            >
              +381
            </span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              placeholder="641234567"
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
              style={{
                flex: 1,
                height: '44px',
                padding: '0 14px',
                fontSize: '16px',
                color: 'var(--color-gray-900)',
                background: 'var(--color-white)',
                border: `1px solid ${errors.phone ? 'var(--color-error)' : 'var(--color-gray-300)'}`,
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
          {errors.phone ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{errors.phone}</p>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          <label
            htmlFor="about"
            style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-gray-700)' }}
          >
            O meni
          </label>
          <textarea
            id="about"
            name="about"
            value={about}
            maxLength={1000}
            rows={5}
            onFocus={() => setAboutFocused(true)}
            onBlur={() => setAboutFocused(false)}
            onChange={(e) => setAbout(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '16px',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              color: 'var(--color-gray-900)',
              background: 'var(--color-white)',
              border: `1px solid ${errors.about ? 'var(--color-error)' : aboutFocused ? 'var(--color-brand-500)' : 'var(--color-gray-300)'}`,
              borderRadius: 'var(--radius-md)',
              outline: aboutFocused && !errors.about ? '3px solid var(--color-brand-100)' : 'none',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            {errors.about ? (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{errors.about}</p>
            ) : (
              <span />
            )}
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-gray-500)' }}>
              {about.length}/1000
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          <label
            htmlFor="primary_location_id"
            style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-gray-700)' }}
          >
            Podrazumevana lokacija
          </label>
          {locations.length === 0 ? (
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-gray-500)' }}>
              Najpre{' '}
              <Link href="/profil/lokacije" style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>
                dodaj lokaciju
              </Link>
            </p>
          ) : (
            <select
              id="primary_location_id"
              name="primary_location_id"
              value={primaryLocationId}
              onChange={(e) => setPrimaryLocationId(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                padding: '0 14px',
                fontSize: '16px',
                color: 'var(--color-gray-900)',
                background: 'var(--color-white)',
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--radius-md)',
              }}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <Button type="submit" fullWidth size="lg" loading={updateProfile.isPending}>
            Sačuvaj promene
          </Button>
          <Link
            href="/profil"
            style={{
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-gray-500)',
              padding: '10px',
            }}
          >
            Odustani
          </Link>
        </div>

        {savedMessage ? (
          <p style={{ margin: 0, textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>
            {savedMessage}
          </p>
        ) : null}

        {updateProfile.isError ? (
          <p style={{ margin: 0, textAlign: 'center', color: 'var(--color-error)', fontSize: '14px' }}>
            {(updateProfile.error as Error)?.message || 'Greška pri čuvanju. Pokušaj ponovo.'}
          </p>
        ) : null}
      </form>
    </div>
  )
}
