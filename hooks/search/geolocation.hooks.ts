'use client'

import { useCallback, useState } from 'react'

import type { Coordinates } from '@/lib/search'

export type GeolocationState = 'idle' | 'pending' | 'granted' | 'denied' | 'unavailable'

export const GEOLOCATION_DENIED_MESSAGE =
  'Nismo mogli da odredimo lokaciju. Unesi grad ručno.'

/**
 * Geolocation is asked for, never assumed. A refusal is a normal outcome with
 * its own message and a manual way forward (doc 03 §5.4) — the modal stays
 * open and the city field takes focus.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>('idle')
  const [coords, setCoords] = useState<Coordinates | null>(null)

  const request = useCallback((): Promise<Coordinates | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState('unavailable')
      return Promise.resolve(null)
    }

    setState('pending')

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCoords(next)
          setState('granted')
          resolve(next)
        },
        () => {
          setState('denied')
          resolve(null)
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
      )
    })
  }, [])

  const reset = useCallback(() => {
    setState('idle')
  }, [])

  return {
    state,
    coords,
    request,
    reset,
    errorMessage: state === 'denied' || state === 'unavailable' ? GEOLOCATION_DENIED_MESSAGE : null,
  }
}
