/**
 * Serbian cities the search can centre on.
 *
 * `radius_km` is a rough stand-in for the city boundary — it decides whether a
 * user's own coordinates count as "inside the selected city", which is what
 * lets search centre on the user instead of the city square (doc 03 §7.4).
 * It is deliberately generous: being wrong by a kilometre only means the
 * search centres on the city centre, which is the safe fallback anyway.
 */
export interface SerbianCity {
  name: string
  lat: number
  lng: number
  radiusKm: number
}

export const SERBIA_CENTER = { lat: 44.0165, lng: 21.0059 }

export const SERBIA_CITIES: SerbianCity[] = [
  { name: 'Beograd', lat: 44.8125, lng: 20.4612, radiusKm: 30 },
  { name: 'Novi Sad', lat: 45.2671, lng: 19.8335, radiusKm: 18 },
  { name: 'Niš', lat: 43.3209, lng: 21.8958, radiusKm: 15 },
  { name: 'Kragujevac', lat: 44.0128, lng: 20.9114, radiusKm: 12 },
  { name: 'Subotica', lat: 46.1005, lng: 19.6651, radiusKm: 12 },
  { name: 'Zrenjanin', lat: 45.3814, lng: 20.3897, radiusKm: 10 },
  { name: 'Pančevo', lat: 44.8708, lng: 20.6403, radiusKm: 10 },
  { name: 'Čačak', lat: 43.8914, lng: 20.3497, radiusKm: 10 },
  { name: 'Novi Pazar', lat: 43.1367, lng: 20.5122, radiusKm: 10 },
  { name: 'Kraljevo', lat: 43.7258, lng: 20.6892, radiusKm: 10 },
  { name: 'Smederevo', lat: 44.6633, lng: 20.9297, radiusKm: 10 },
  { name: 'Leskovac', lat: 42.9981, lng: 21.9461, radiusKm: 10 },
  { name: 'Užice', lat: 43.8556, lng: 19.8425, radiusKm: 10 },
  { name: 'Valjevo', lat: 44.2708, lng: 19.8903, radiusKm: 10 },
  { name: 'Kruševac', lat: 43.5806, lng: 21.3269, radiusKm: 10 },
  { name: 'Vranje', lat: 42.5514, lng: 21.9008, radiusKm: 10 },
  { name: 'Šabac', lat: 44.7489, lng: 19.6903, radiusKm: 10 },
  { name: 'Sombor', lat: 45.7742, lng: 19.1122, radiusKm: 10 },
  { name: 'Požarevac', lat: 44.6197, lng: 21.1861, radiusKm: 10 },
  { name: 'Pirot', lat: 43.1531, lng: 22.5861, radiusKm: 10 },
  { name: 'Zaječar', lat: 43.9042, lng: 22.2811, radiusKm: 10 },
  { name: 'Kikinda', lat: 45.8297, lng: 20.4650, radiusKm: 10 },
  { name: 'Sremska Mitrovica', lat: 44.9767, lng: 19.6122, radiusKm: 10 },
  { name: 'Jagodina', lat: 43.9772, lng: 21.2611, radiusKm: 10 },
  { name: 'Vršac', lat: 45.1167, lng: 21.3033, radiusKm: 10 },
  { name: 'Bor', lat: 44.0747, lng: 22.0961, radiusKm: 10 },
  { name: 'Prokuplje', lat: 43.2342, lng: 21.5875, radiusKm: 10 },
  { name: 'Loznica', lat: 44.5333, lng: 19.2256, radiusKm: 10 },
  { name: 'Ćuprija', lat: 43.9281, lng: 21.3689, radiusKm: 10 },
  { name: 'Aleksinac', lat: 43.5417, lng: 21.7050, radiusKm: 10 },
  { name: 'Vrbas', lat: 45.5722, lng: 19.6414, radiusKm: 10 },
  { name: 'Bačka Palanka', lat: 45.2500, lng: 19.3936, radiusKm: 10 },
  { name: 'Inđija', lat: 45.0489, lng: 20.0797, radiusKm: 10 },
  { name: 'Ruma', lat: 45.0078, lng: 19.8228, radiusKm: 10 },
  { name: 'Gornji Milanovac', lat: 44.0272, lng: 20.4589, radiusKm: 10 },
  { name: 'Paraćin', lat: 43.8600, lng: 21.4083, radiusKm: 10 },
  { name: 'Senta', lat: 45.9269, lng: 20.0900, radiusKm: 10 },
]

/** Diacritics-insensitive match, so "cacak" finds "Čačak" the way search does. */
export function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    // Strip the combining marks NFD just separated out (č → c + ˇ).
    .replace(/[\u0300-\u036f]/g, '')
    // đ carries no combining mark — it is its own letter, so NFD leaves it be.
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

export function findCity(name: string | null | undefined): SerbianCity | null {
  if (!name) return null
  const needle = normalizeForCompare(name)
  return SERBIA_CITIES.find((city) => normalizeForCompare(city.name) === needle) ?? null
}

export function searchCities(term: string): SerbianCity[] {
  const needle = normalizeForCompare(term)
  if (!needle) return SERBIA_CITIES
  return SERBIA_CITIES.filter((city) => normalizeForCompare(city.name).includes(needle))
}
