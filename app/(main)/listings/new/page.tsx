import { redirect } from 'next/navigation'

export default function LegacyNewListingPage() {
  redirect('/profile/listings/new')
}
