import { redirect } from 'next/navigation'

import { SETTINGS_EDIT } from '@/lib/profiles'

/** Moved under Podešavanja; old links and bookmarks still land right. */
export default function LegacyProfileEditPage() {
  redirect(SETTINGS_EDIT)
}
