import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { TrackingMap, type MapMarker } from '@/components/TrackingMap'
import {
  AppHeader,
  AppInput,
  AppText,
  Card,
  LocationCard,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
} from '@/components/ui'
import { useLocationStore, type PickupLocation } from '@/store/locationStore'
import { useAppTheme } from '@/theme'

function formatAddress(address: Location.LocationGeocodedAddress): string {
  const parts = [
    address.name,
    address.streetNumber,
    address.street,
    address.district,
    address.city,
    address.region,
    address.country,
  ].filter((part): part is string => Boolean(part?.trim()))
  return parts.join(', ') || address.formattedAddress || ''
}

export default function LocationPickerScreen() {
  const router = useRouter()
  const t = useAppTheme()
  const storedPickup = useLocationStore((state) => state.pickup)
  const setPickup = useLocationStore((state) => state.setPickup)

  const [latitude, setLatitude] = useState(storedPickup ? String(storedPickup.lat) : '')
  const [longitude, setLongitude] = useState(storedPickup ? String(storedPickup.lng) : '')
  const [address, setAddress] = useState(storedPickup?.address ?? '')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<PickupLocation | null>(storedPickup)
  const [locating, setLocating] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = useMemo(() => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  }, [latitude, longitude])

  const markers: MapMarker[] = useMemo(() => {
    const point = draft ?? (parsed ? { ...parsed, address: '', source: 'manual' as const } : null)
    if (!point) return []
    return [{ id: 'pickup', latitude: point.lat, longitude: point.lng, kind: 'user', label: 'Pickup' }]
  }, [draft, parsed])

  const locateCurrentPosition = async () => {
    setLocating(true)
    setError(null)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Location permission is off. Enter an address or coordinates instead.')
        return
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      setLatitude(String(lat))
      setLongitude(String(lng))

      let label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      if (Platform.OS !== 'web') {
        try {
          const [geocoded] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
          if (geocoded) {
            const formatted = formatAddress(geocoded)
            if (formatted) {
              label = formatted
              setAddress(formatted)
            }
          }
        } catch {
          // Coordinates are still usable when reverse geocoding is unavailable.
        }
      }
      if (!address) setAddress(label)
      setDraft({ lat, lng, address: label, source: 'gps' })
    } catch {
      setError('We could not get a GPS fix. Enter an address or coordinates instead.')
    } finally {
      setLocating(false)
    }
  }

  const searchAddress = async () => {
    if (!query.trim()) {
      setError('Enter an address to search.')
      return
    }
    if (Platform.OS === 'web') {
      setError('Address search is available in the mobile app. Enter coordinates instead.')
      return
    }

    setSearching(true)
    setError(null)
    try {
      const results = await Location.geocodeAsync(query.trim())
      const result = results[0]
      if (!result) {
        setError('No matching address was found. Try a landmark or enter coordinates.')
        return
      }
      const lat = result.latitude
      const lng = result.longitude
      setLatitude(String(lat))
      setLongitude(String(lng))

      let label = query.trim()
      try {
        const [geocoded] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        if (geocoded) label = formatAddress(geocoded) || label
      } catch {
        // Keep the user's query as the address label.
      }
      setAddress(label)
      setDraft({ lat, lng, address: label, source: 'address' })
    } catch {
      setError('Address search is unavailable right now. Try again or enter coordinates.')
    } finally {
      setSearching(false)
    }
  }

  const applyCoordinates = () => {
    if (!parsed) {
      setError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180).')
      return
    }
    const label = address.trim() || `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`
    setAddress(label)
    setDraft({ lat: parsed.lat, lng: parsed.lng, address: label, source: 'address' })
    setError(null)
  }

  const confirmPickup = () => {
    const point = draft ?? (parsed ? {
      ...parsed,
      address: address.trim() || `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`,
      source: 'manual' as const,
    } : null)
    if (!point) {
      setError('Choose a pickup location first.')
      return
    }
    setPickup(point)
    router.back()
  }

  return (
    <Screen header={<AppHeader title="Pickup location" subtitle="Confirm where the crew should meet you." showBack compact hideDivider />}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Notice text="We use this point to find nearby ambulances. You can adjust it before dispatch." tone="info" />

          <LocationCard
            label="Quick option"
            value="Use my current location"
            detail="Requests device location permission"
            icon="locate-outline"
            actionLabel={locating ? 'Locating…' : 'Use GPS'}
            onPress={() => void locateCurrentPosition()}
          />

          <SectionHeader title="Find an address" subtitle="Available on mobile devices" />
          <Card style={styles.card}>
            <AppInput
              label="Address or landmark"
              icon="search-outline"
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. Landmark or street address"
              onSubmitEditing={() => void searchAddress()}
            />
            <SecondaryButton
              label="Search address"
              icon="search-outline"
              size="sm"
              onPress={() => void searchAddress()}
              loading={searching}
            />
          </Card>

          <SectionHeader title="Adjust pin" subtitle="Enter coordinates or edit the address label" />
          <Card style={styles.card}>
            <View style={styles.coords}>
              <AppInput
                label="Latitude"
                value={latitude}
                onChangeText={setLatitude}
                placeholder="Latitude"
                keyboardType="decimal-pad"
                autoCapitalize="none"
              />
              <AppInput
                label="Longitude"
                value={longitude}
                onChangeText={setLongitude}
                placeholder="Longitude"
                keyboardType="decimal-pad"
                autoCapitalize="none"
              />
            </View>
            <AppInput
              label="Address label"
              icon="business-outline"
              value={address}
              onChangeText={setAddress}
              placeholder="Where should the crew meet you?"
            />
            <SecondaryButton label="Apply coordinates" icon="location-outline" size="sm" onPress={applyCoordinates} />
          </Card>

          <View style={styles.mapWrap}>
            <TrackingMap
              markers={markers}
              height={180}
              caption={draft ? 'SELECTED PICKUP' : 'NO PICKUP SELECTED'}
            />
          </View>

          {error ? <Notice text={error} tone="danger" /> : null}

          {draft ? (
            <View style={[styles.selected, { backgroundColor: t.colors.primarySoft, borderRadius: t.radius.md }]}>
              <AppText variant="caption" color="primary">
                Selected: {draft.address}
              </AppText>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: t.colors.bgElevated, borderTopColor: t.colors.border }]}>
          <PrimaryButton
            label="Use this pickup location"
            size="lg"
            icon="checkmark-circle-outline"
            onPress={confirmPickup}
            disabled={!draft && !parsed}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { gap: 12, paddingBottom: 16 },
  card: { gap: 12 },
  coords: { flexDirection: 'row', gap: 12 },
  mapWrap: { marginTop: 4 },
  selected: { padding: 12 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
})
