import { http } from './api'

/** Mirrors the backend geocoding result (`services/geocodingService.ts`). */
export interface GeocodeResult {
  latitude: number
  longitude: number
  address: string
  placeName: string | null
  detail?: string | null
  provider: string
}

export interface SearchProximity {
  latitude: number
  longitude: number
}

/**
 * Address lookup goes through the app's authenticated backend endpoints. A
 * failed lookup returns no result rather than inventing coordinates; the user
 * can always describe a landmark or drop a pin instead.
 */
export const locationService = {
  search: (query: string, limit = 6, proximity?: SearchProximity) =>
    http.get<{ success: boolean; provider: string; results: GeocodeResult[] }>('/locations/search', {
      params: {
        q: query.trim(),
        limit,
        ...(proximity ? { latitude: proximity.latitude, longitude: proximity.longitude } : {}),
      },
    }),

  reverse: (latitude: number, longitude: number) =>
    http.get<{ success: boolean; provider: string; result: GeocodeResult | null }>('/locations/reverse-geocode', {
      params: { latitude, longitude },
    }),
}
