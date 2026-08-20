import { redirect } from 'next/navigation'

import { SETTINGS_LOCATIONS } from '@/lib/profiles'

/** Moved under Podešavanja; old links and bookmarks still land right. */
export default function LegacyProfileLocationsPage() {
  redirect(SETTINGS_LOCATIONS)
}
