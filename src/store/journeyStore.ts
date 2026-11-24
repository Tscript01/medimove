import { create } from 'zustand'
import type { MapCoordinate } from '../components/MapCanvas.types'
import type { PickupLocation } from './locationStore'
import { makeIdempotencyKey } from '../utils/id'

export type JourneyPhase = 'about-to-start' | 'travelling'
export type JourneyStatus = 'active' | 'stopped'

export interface JourneyFix extends MapCoordinate {
  accuracyMeters: number | null
  recordedAt: string
}

export interface JourneyDestination {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
}

export interface JourneySession {
  id: string
  startedAt: string
  phase: JourneyPhase
  pickup: PickupLocation
  destination: JourneyDestination
  status: JourneyStatus
  lastFix: JourneyFix | null
  trail: MapCoordinate[]
  /** Set when device location permission is denied or a fix fails. */
  locationError: string | null
}

interface JourneyInput {
  phase: JourneyPhase
  pickup: PickupLocation
  destination: JourneyDestination
}

interface JourneyState {
  session: JourneySession | null
  start: (input: JourneyInput) => void
  recordFix: (fix: JourneyFix) => void
  setLocationError: (message: string | null) => void
  stop: () => void
  clear: () => void
}

/**
 * Device-local journey tracking for people already travelling independently.
 *
 * This is deliberately not persisted and is never sent to a backend: MediMove
 * has no journey-session endpoint. The UI must say so, and must never imply an
 * ambulance was dispatched or that another person can see a live journey.
 */
export const useJourneyStore = create<JourneyState>((set) => ({
  session: null,

  start: ({ phase, pickup, destination }) =>
    set({
      session: {
        id: makeIdempotencyKey(),
        startedAt: new Date().toISOString(),
        phase,
        pickup,
        destination,
        status: 'active',
        lastFix: null,
        trail: [{ latitude: pickup.lat, longitude: pickup.lng }],
        locationError: null,
      },
    }),

  recordFix: (fix) =>
    set((state) => {
      const session = state.session
      if (!session || session.status !== 'active') return state
      const last = session.lastFix
      const duplicate =
        last != null &&
        Math.abs(last.latitude - fix.latitude) < 0.00001 &&
        Math.abs(last.longitude - fix.longitude) < 0.00001
      return {
        session: {
          ...session,
          lastFix: fix,
          locationError: null,
          trail: duplicate ? session.trail : [...session.trail, { latitude: fix.latitude, longitude: fix.longitude }],
        },
      }
    }),

  setLocationError: (message) =>
    set((state) => (state.session ? { session: { ...state.session, locationError: message } } : state)),

  stop: () => set((state) => (state.session ? { session: { ...state.session, status: 'stopped' } } : state)),

  clear: () => set({ session: null }),
}))
