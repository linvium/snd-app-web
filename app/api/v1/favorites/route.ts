import { requireUser } from '@/lib/api/auth'
import { apiList } from '@/lib/api/response'
import { listFavoriteListings } from '@/lib/favorites/favorites.server'

export async function GET() {
  const auth = await requireUser({ emailVerified: false })
  if (!auth.ok) return auth.response

  const result = await listFavoriteListings(auth.supabase, auth.userId)
  if ('response' in result) return result.response
  return apiList(result, { total: result.length })
}
