import { create } from 'zustand'

export type PickupSource = 'gps' | 'manual' | 'address'

export interface PickupLocation {
  lat: number
  lng: number
  address: string
  source: PickupSource
  /** A local GPS fix must be reviewed before it can be used for a request. */
  confirmed: boolean
  /** Nearby building or landmark. Strongly recommended for manual pins. */
  landmark?: string
}

interface LocationState {
  pickup: PickupLocation | null
  setPickup: (pickup: PickupLocation) => void
  clearPickup: () => void
}

/**
 * Client-only pickup selection shared by Home and the location picker. It is
 * deliberately separate from GPS readings and is never sent to a fake endpoint.
 */
export const useLocationStore = create<LocationState>((set) => ({
  pickup: null,
  setPickup: (pickup) => set({ pickup }),
  clearPickup: () => set({ pickup: null }),
}))
