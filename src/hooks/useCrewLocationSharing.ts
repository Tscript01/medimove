import * as Location from 'expo-location'
import { useEffect, useState } from 'react'
import {
  crewService,
  type RecordCrewLocationInput,
} from '../services/crew.service'

/**
 * Foreground-only crew GPS sharing for an accepted trip.
 *
 * Sharing never starts by itself: `enabled` must be switched on by the crew
 * member with an explicit Start action. Each watch fix is one server-stamped
 * POST, and the timestamp returned by the server is what the UI reports. There
 * is no background location and no locally-invented "live" state — removing the
 * watcher stops sharing.
 */

export interface CrewLocationSharingState {
  /** Watch is running. It does not guarantee the newest fix reached the server. */
  active: boolean
  starting: boolean
  error: string | null
  /** Server-recorded time of the newest accepted fix. */
  lastSharedAt: string | null
}

const INITIAL_STATE: CrewLocationSharingState = {
  active: false,
  starting: false,
  error: null,
  lastSharedAt: null,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function toPayload(position: Location.LocationObject): RecordCrewLocationInput {
  const speed = position.coords.speed
  const heading = position.coords.heading
  const accuracy = position.coords.accuracy
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: accuracy != null && Number.isFinite(accuracy) ? accuracy : undefined,
    speedKph: speed != null && Number.isFinite(speed) ? clamp(speed * 3.6, 0, 400) : undefined,
    headingDeg: heading != null && Number.isFinite(heading) ? clamp(heading, 0, 360) : undefined,
    source: 'GPS',
  }
}

export function useCrewLocationSharing(tripId: string | null, enabled: boolean): CrewLocationSharingState {
  const [state, setState] = useState<CrewLocationSharingState>(INITIAL_STATE)

  useEffect(() => {
    if (!tripId || !enabled) return

    let cancelled = false
    let subscription: Location.LocationSubscription | null = null
    let sending = false
    let queued: RecordCrewLocationInput | null = null

    const send = async (payload: RecordCrewLocationInput) => {
      queued = payload
      if (sending) return
      sending = true
      try {
        while (!cancelled && queued) {
          const next = queued
          queued = null
          const response = await crewService.recordLocation(tripId, next)
          if (!cancelled && response.location.recordedAt) {
            setState((previous) => ({ ...previous, lastSharedAt: response.location.recordedAt }))
          }
        }
      } catch {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            error: 'Sharing is still on, but the last update did not send. We will keep trying.',
          }))
        }
      } finally {
        sending = false
        if (!cancelled && queued) void send(queued)
      }
    }

    const onFix = (position: Location.LocationObject) => {
      if (!cancelled) void send(toPayload(position))
    }

    const start = async () => {
      setState((previous) => ({ ...previous, starting: true, error: null }))
      const permission = await Location.requestForegroundPermissionsAsync()
      if (cancelled) return
      if (permission.status !== 'granted') {
        setState({ ...INITIAL_STATE, error: 'Location permission is off. Sharing is stopped.' })
        return
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      if (cancelled) return
      onFix(current)

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 15,
        },
        onFix,
      )
      if (cancelled) {
        subscription.remove()
        subscription = null
        return
      }

      setState((previous) => ({ ...previous, active: true, starting: false }))
    }

    void start().catch(() => {
      if (!cancelled) {
        setState({ ...INITIAL_STATE, error: 'Location sharing is unavailable on this device right now.' })
      }
    })

    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [tripId, enabled])

  return tripId && enabled ? state : INITIAL_STATE
}
