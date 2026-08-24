import { FavoriteListings } from '@/components/favorites/FavoriteListings'

export const metadata = {
  title: 'Omiljeni',
}

export default function ProfileFavoritesPage() {
  return (
    <div>
      <h1 className="mt-0 mb-6 hidden text-[22px] font-normal text-foreground lg:block">Omiljeni</h1>
      <FavoriteListings />
    </div>
  )
}
