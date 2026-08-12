import { createClient } from '@/lib/supabase/client'
import type { SndLocation, AddLocationInput } from '@/types'

const getClient = () => createClient()

/** Fuzz coordinates by 200–500m (computed once on save) */
function fuzzCoordinates(lat: number, lng: number): { approxLat: number; approxLng: number } {
  const angle = Math.random() * 2 * Math.PI
  // 200–500m in degrees (≈ 0.002–0.005 degrees)
  const distance = (200 + Math.random() * 300) / 111320
  return {
    approxLat: lat + distance * Math.cos(angle),
    approxLng: lng + distance * Math.sin(angle),
  }
}

export const locationService = {
  getLocations: async (): Promise<SndLocation[]> => {
    const supabase = getClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Nije prijavljen')

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as SndLocation[]
  },

  addLocation: async (input: AddLocationInput): Promise<SndLocation> => {
    const supabase = getClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Nije prijavljen')

    const { count } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if ((count ?? 0) >= 10) {
      throw new Error('Možeš imati najviše 10 lokacija.')
    }

    const isDefault = (count ?? 0) === 0 ? true : (input.is_default ?? false)

    if (isDefault) {
      await supabase.from('locations').update({ is_default: false }).eq('user_id', user.id)
    }

    const { approxLat, approxLng } = fuzzCoordinates(input.latitude, input.longitude)

    const { data, error } = await supabase
      .from('locations')
      .insert({
        user_id: user.id,
        label: input.label,
        street: input.street,
        city: input.city,
        postal_code: input.postal_code ?? null,
        country_code: 'RS',
        latitude: input.latitude,
        longitude: input.longitude,
        approx_latitude: approxLat,
        approx_longitude: approxLng,
        is_default: isDefault,
      })
      .select()
      .single()

    if (error) throw error
    return data as SndLocation
  },

  deleteLocation: async (locationId: string): Promise<void> => {
    const supabase = getClient()

    const { error } = await supabase
      .from('locations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', locationId)

    if (error) throw error
  },

  setDefaultLocation: async (locationId: string): Promise<void> => {
    const supabase = getClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Nije prijavljen')

    await supabase.from('locations').update({ is_default: false }).eq('user_id', user.id)
    const { error } = await supabase
      .from('locations')
      .update({ is_default: true })
      .eq('id', locationId)
    if (error) throw error
  },
}
