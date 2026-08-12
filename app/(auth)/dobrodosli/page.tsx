'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { useUpdateProfile } from '@/hooks/user/useUser'
import { useAddLocation } from '@/hooks/user/useLocation'

function normalizePhone(input: string): string | null {
  const cleaned = input.trim().replace(/\s/g, '')
  if (!cleaned) return null

  if (cleaned.startsWith('0')) {
    return '+381' + cleaned.slice(1)
  }
  return '+381' + cleaned
}

function GpsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

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
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [addressFocused, setAddressFocused] = useState(false)

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

    const digits = phoneInput.replace(/\D/g, '')
    if (digits && digits.length < 6) {
      setPhoneError('Unesi ispravan broj telefona.')
      return
    }

    const phone = normalizePhone(phoneInput)

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
      <h1
        style={{
          margin: '0 0 8px',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--color-gray-900)',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        Dobro došao na SND
      </h1>
      <p
        style={{
          margin: '0 0 28px',
          color: 'var(--color-gray-500)',
          fontSize: '15px',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        Dva podatka i spreman si. Možeš i da preskočiš — dodaćeš ih kasnije.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          <label
            htmlFor="onboarding-phone"
            style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-gray-700)' }}
          >
            Telefon
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '44px',
              padding: '0 14px',
              background: 'var(--color-white)',
              border: `1px solid ${phoneError ? 'var(--color-error)' : phoneFocused ? 'var(--color-brand-500)' : 'var(--color-gray-300)'}`,
              borderRadius: 'var(--radius-md)',
              outline: phoneFocused && !phoneError ? '3px solid var(--color-brand-100)' : 'none',
            }}
          >
            <span
              style={{
                color: 'var(--color-gray-500)',
                fontSize: '16px',
                marginRight: '6px',
                flexShrink: 0,
                userSelect: 'none',
              }}
            >
              +381
            </span>
            <input
              id="onboarding-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phoneInput}
              disabled={isSaving}
              placeholder="641234567"
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              onChange={(e) => {
                setPhoneInput(e.target.value.replace(/[^\d]/g, ''))
                if (phoneError) setPhoneError('')
              }}
              style={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '16px',
                color: 'var(--color-gray-900)',
                padding: 0,
              }}
            />
          </div>
          {phoneError ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>{phoneError}</p>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-gray-500)' }}>
              Ne prikazuje se javno.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          <label
            htmlFor="onboarding-location"
            style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-gray-700)' }}
          >
            Lokacija
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="onboarding-location"
              name="location"
              type="text"
              value={addressLabel}
              disabled={isSaving}
              placeholder="Ulica, grad"
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setAddressFocused(false)}
              onChange={(e) => setAddressLabel(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                height: '44px',
                padding: '0 14px',
                fontSize: '16px',
                color: 'var(--color-gray-900)',
                background: 'var(--color-white)',
                border: `1px solid ${addressFocused ? 'var(--color-brand-500)' : 'var(--color-gray-300)'}`,
                borderRadius: 'var(--radius-md)',
                outline: addressFocused ? '3px solid var(--color-brand-100)' : 'none',
              }}
            />
            <button
              type="button"
              aria-label="Koristi moju lokaciju"
              title="Koristi moju lokaciju"
              disabled={isSaving || geoLoading}
              onClick={requestGeolocation}
              style={{
                width: '44px',
                height: '44px',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-300)',
                background: 'var(--color-white)',
                color: coordinates ? 'var(--color-brand-600)' : 'var(--color-gray-700)',
                cursor: isSaving || geoLoading ? 'not-allowed' : 'pointer',
                opacity: isSaving || geoLoading ? 0.5 : 1,
              }}
            >
              <GpsIcon />
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-gray-500)' }}>
            Da bismo ti pokazali stvari blizu tebe.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
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
          <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', color: 'var(--color-error)' }}>
            {formError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
