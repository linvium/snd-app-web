import { redirect } from 'next/navigation'

import { SETTINGS_VERIFICATION } from '@/lib/profiles'

/** Moved under Podešavanja; old links and bookmarks still land right. */
export default function LegacyProfileVerificationPage() {
  redirect(SETTINGS_VERIFICATION)
}
