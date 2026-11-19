import type { FleetResponse, Hospital } from '../types'
import { http } from './api'

/**
 * Fleet & reference data. `GET /ambulances` is public and requires coordinates —
 * there is deliberately no default location, so the client must supply GPS or a
 * map pin. It returns the ranked hospital list plus nearby providers with
 * server-computed fares.
 */
export const fleetService = {
  getFleet: (lat: number, lng: number) =>
    http.get<FleetResponse>(`/ambulances?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),

  /** Full hospital directory (reference data). */
  getHospitals: () => http.get<{ success: boolean; hospitals: Hospital[] }>('/hospitals'),

  /** Service states, for location forms. */
  getStates: () => http.get<{ success: boolean; states: { id: string; name: string; code: string }[] }>('/states'),
}
