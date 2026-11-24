import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useJourneyStore } from '../store/journeyStore'

/**
 * Foreground location updates for a device-local journey session. No data is
 * uploaded: the only consumer is the live journey screen on this device.
 */
export function useJourneyLocation() {
  const sessionId = useJourneyStore((state) => state.session?.id)
  const status = useJourneyStore((state) => state.session?.status)
  const recordFix = useJourneyStore((state) => state.recordFix)
  const setLocationError = useJourneyStore((state) => state.setLocationError)

  useEffect(() => {
    if (!sessionId || status !== 'active') return

    let cancelled = false
    let subscription: Location.LocationSubscription | null = null

    const toFix = (position: Location.LocationObject) => ({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy,
      recordedAt: new Date(position.timestamp).toISOString(),
    })

    const start = async () => {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (cancelled) return

      if (permission.status !== 'granted') {
        setLocationError('Location permission is off. Last updated position is shown below.')
        return
      }

      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        if (!cancelled) recordFix(toFix(current))
      } catch {
        if (!cancelled) setLocationError('Could not get a GPS fix yet. Last updated position is shown below.')
      }

      if (cancelled) return
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 15,
        },
        (position) => {
          if (!cancelled) recordFix(toFix(position))
        }
      )
    }

    void start().catch(() => {
      if (!cancelled) setLocationError('Location updates are unavailable. Last updated position is shown below.')
    })

    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [sessionId, status, recordFix, setLocationError])
}
