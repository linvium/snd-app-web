import { redirect } from 'next/navigation'

export default function LegacyFavoritesPage() {
  redirect('/profile/favorites')
}
