import { createClient } from '@/lib/supabase/client'

export const favoritesService = {
  add: async (listingId: string): Promise<void> => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Nije prijavljen')

    const { error } = await supabase
      .from('favorites')
      .upsert({ user_id: user.id, listing_id: listingId })
    if (error) throw error
  },

  remove: async (listingId: string): Promise<void> => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Nije prijavljen')

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
    if (error) throw error
  },
}
