import type { SndUser, SndLocation, ProfileCompleteness } from '@/types'
import type { KycDbStatus } from '@/types/kyc'

export function calculateProfileCompleteness(
  user: SndUser | null | undefined,
  locations: SndLocation[],
  kycStatus?: KycDbStatus | null
): ProfileCompleteness {
  const profile = user?.user_profiles

  const items = [
    {
      name: 'Email potvrđen',
      completed: !!user?.email_verified_at,
      link: '',
      weight: 20,
    },
    {
      name: 'Ime i prezime',
      completed: !!(profile?.first_name && profile?.last_name),
      link: '/profile/edit',
      weight: 15,
    },
    {
      name: 'Profilna slika',
      completed: !!profile?.avatar_url,
      link: '/profile/edit',
      weight: 15,
    },
    {
      name: 'Broj telefona',
      completed: !!profile?.phone,
      link: '/profile/edit',
      weight: 15,
    },
    {
      name: 'Lokacija',
      completed: locations.length > 0,
      link: '/profile/locations',
      weight: 15,
    },
    {
      name: 'O meni',
      completed: !!(profile?.about && profile.about.length >= 20),
      link: '/profile/edit',
      weight: 10,
    },
    {
      name: 'KYC verifikacija',
      completed: kycStatus === 'verified',
      link: '/profile/verification',
      weight: 10,
    },
  ]

  const percentage = items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0)

  return {
    percentage,
    items: items
      .filter((item) => !item.completed && item.link)
      .map(({ name, link }) => ({ name, completed: false, link })),
  }
}
