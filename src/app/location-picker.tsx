import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { RoleGate } from '@/components/RoleGate'
import { MapCanvas, type MapCoordinate, type MapMarker } from '@/components/MapCanvas'
import {
  AppHeader,
  AppInput,
  AppText,
  Card,
  ListGroup,
  ListRow,
  LocationCard,
  Notice,
  PrimaryButton,
  Screen,
  SectionHeader,
  SecondaryButton,
  Spinner,
} from '@/components/ui'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { locationService, type GeocodeResult, type SearchProximity } from '@/services/location.service'
import { useLocationStore, type PickupLocation } from '@/store/locationStore'
import { useAppTheme } from '@/theme'

const GPS_TIMEOUT_MS = 9000
const SEARCH_DEBOUNCE_MS = 350
const MIN_SEARCH_LENGTH = 3

function coordinatesLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

function LocationPickerContent() {
  const navigation = useSafeNavigation()
  const t = useAppTheme()
  const storedPickup = useLocationStore((state) => state.pickup)
  const setPickup = useLocationStore((state) => state.setPickup)

  const [latitude, setLatitude] = useState(storedPickup ? String(storedPickup.lat) : '')
  const [longitude, setLongitude] = useState(storedPickup ? String(storedPickup.lng) : '')
  const [address, setAddress] = useState(storedPickup?.address ?? '')
  const [landmark, setLandmark] = useState(storedPickup?.landmark ?? '')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [searchProvider, setSearchProvider] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [draft, setDraft] = useState<PickupLocation | null>(storedPickup)
  const [locating, setLocating] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Only biases search ranking. It is never treated as a confirmed pickup.
  const [searchBias, setSearchBias] = useState<SearchProximity | null>(() =>
    storedPickup ? { latitude: storedPickup.lat, longitude: storedPickup.lng } : null
  )

  const searchRunRef = useRef(0)
  const selectedQueryRef = useRef<string | null>(null)

  const parsed = useMemo(() => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!latitude.trim() || !longitude.trim()) return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  }, [latitude, longitude])

  const markers: MapMarker[] = useMemo(() => {
    const point = draft ?? (parsed ? { lat: parsed.lat, lng: parsed.lng, address: '', source: 'manual' as const } : null)
    if (!point) return []
    return [{ id: 'pickup', latitude: point.lat, longitude: point.lng, kind: 'user', label: 'Pickup' }]
  }, [draft, parsed])

  const runSearch = useCallback(async (text: string) => {
    const term = text.trim()
    if (term.length < MIN_SEARCH_LENGTH || term === selectedQueryRef.current) return

    const run = ++searchRunRef.current
    setSearching(true)
    setSearchError(null)
    try {
      const response = await locationService.search(term, 8, searchBias ?? undefined)
      if (run !== searchRunRef.current) return
      setSuggestions(response.results)
      setSearchProvider(response.provider || null)
      if (response.results.length === 0) {
        setSearchError('No matching address was found. Try a shorter landmark or drop a pin.')
      }
    } catch (err) {
      if (run !== searchRunRef.current) return
      setSuggestions([])
      setSearchProvider(null)
      setSearchError((err as Error)?.message || 'Address search is unavailable. You can still drop a pin.')
    } finally {
      if (run === searchRunRef.current) setSearching(false)
    }
  }, [searchBias])

  useEffect(() => {
    const term = query.trim()
    if (term.length < MIN_SEARCH_LENGTH || term === selectedQueryRef.current) {
      searchRunRef.current += 1
      setSuggestions([])
      setSearchProvider(null)
      setSearching(false)
      setSearchError(null)
      return
    }
    const timer = setTimeout(() => {
      void runSearch(term)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, runSearch])

  const handleQueryChange = (text: string) => {
    selectedQueryRef.current = null
    setQuery(text)
    setError(null)
  }

  const clearSearch = () => {
    selectedQueryRef.current = null
    searchRunRef.current += 1
    setQuery('')
    setSuggestions([])
    setSearchProvider(null)
    setSearching(false)
    setSearchError(null)
    setError(null)
  }

  const selectSuggestion = useCallback(
    (result: GeocodeResult) => {
      if (!Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) return
      const label = result.address || result.placeName || query.trim()
      if (!label) return

      selectedQueryRef.current = label
      setQuery(label)
      setLatitude(String(result.latitude))
      setLongitude(String(result.longitude))
      setAddress(label)
      setSearchBias({ latitude: result.latitude, longitude: result.longitude })
      setDraft({
        lat: result.latitude,
        lng: result.longitude,
        address: label,
        source: 'address',
        confirmed: false,
      })
      setSuggestions([])
      setSearchError(null)
      setSearching(false)
      setError(null)
    },
    [query]
  )

  const handleSearchSubmit = () => {
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0])
      return
    }
    void runSearch(query)
  }

  const reverseLabel = async (lat: number, lng: number, fallback: string): Promise<string> => {
    try {
      const response = await locationService.reverse(lat, lng)
      if (response.result?.address) return response.result.address
    } catch {
      // Keep the fallback label; coordinates are still explicit.
    }
    return fallback
  }

  const locateCurrentPosition = async () => {
    if (locating) return
    clearSearch()
    setLocating(true)
    setError(null)
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setError('Location permission is off. Search for an address or drop a pin instead.')
        return
      }

      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), GPS_TIMEOUT_MS)),
      ])

      if (!position) {
        setError('No GPS fix yet. Search for an address or drop a pin instead.')
        return
      }

      const age = Date.now() - position.timestamp
      if (age > 120_000) {
        setError('The device location is out of date. Search for an address or drop a pin instead.')
        return
      }

      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const label = await reverseLabel(lat, lng, coordinatesLabel(lat, lng))
      setLatitude(String(lat))
      setLongitude(String(lng))
      setAddress(label)
      setSearchBias({ latitude: lat, longitude: lng })
      setDraft({ lat, lng, address: label, source: 'gps', confirmed: false })
    } catch {
      setError('We could not get a GPS fix. Search for an address or drop a pin instead.')
    } finally {
      setLocating(false)
    }
  }

  const changeAddress = (text: string) => {
    setAddress(text)
    setDraft((previous) => (previous ? { ...previous, address: text } : previous))
  }

  const changeLandmark = (text: string) => {
    setLandmark(text)
    setDraft((previous) => (previous ? { ...previous, landmark: text || undefined } : previous))
  }

  const applyCoordinates = () => {
    if (!parsed) {
      setError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180).')
      return
    }
    const label = address.trim() || coordinatesLabel(parsed.lat, parsed.lng)
    setAddress(label)
    setSearchBias({ latitude: parsed.lat, longitude: parsed.lng })
    setDraft({ lat: parsed.lat, lng: parsed.lng, address: label, source: 'manual', confirmed: false })
    setError(null)
  }

  const pickOnMap = async (coordinate: MapCoordinate) => {
    const label = await reverseLabel(
      coordinate.latitude,
      coordinate.longitude,
      coordinatesLabel(coordinate.latitude, coordinate.longitude)
    )
    setLatitude(String(coordinate.latitude))
    setLongitude(String(coordinate.longitude))
    setAddress(label)
    setSearchBias({ latitude: coordinate.latitude, longitude: coordinate.longitude })
    setDraft({
      lat: coordinate.latitude,
      lng: coordinate.longitude,
      address: label,
      source: 'manual',
      confirmed: false,
    })
    setError(null)
  }

  const confirmPickup = () => {
    const point =
      draft ??
      (parsed
        ? {
            lat: parsed.lat,
            lng: parsed.lng,
            address: address.trim() || coordinatesLabel(parsed.lat, parsed.lng),
            source: 'manual' as const,
          }
        : null)

    if (!point) {
      setError('Choose a pickup location first.')
      return
    }

    const finalPickup: PickupLocation = {
      ...point,
      address: address.trim() || point.address || coordinatesLabel(point.lat, point.lng),
      landmark: landmark.trim() || undefined,
      confirmed: true,
    }

    if (finalPickup.source === 'manual' && !finalPickup.landmark) {
      setError('Describe a nearby building or landmark so the crew can find this pin.')
      return
    }

    setPickup(finalPickup)
    navigation.back()
  }

  const showSuggestions = query.trim().length >= MIN_SEARCH_LENGTH

  return (
    <Screen
      header={
        <AppHeader
          title="Set pickup"
          subtitle="Search, use GPS, or place the pin yourself."
          showBack
          compact
          hideDivider
        />
      }
      scroll
      avoidKeyboard
      footer={
        <View style={styles.footer}>
          <PrimaryButton
            label="Confirm this pickup point"
            size="lg"
            icon="checkmark-circle-outline"
            onPress={confirmPickup}
            disabled={!draft && !parsed}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Notice
          text="Location is never guessed. Choose an address, use GPS, or drop a pin — then confirm the meeting point."
          tone="info"
        />

        <View style={styles.section}>
          <Card style={styles.card}>
            <AppInput
              label="Search for pickup"
              icon="search-outline"
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Street, building, landmark or area"
              autoFocus={!storedPickup}
              returnKeyType="search"
              autoCorrect
              autoCapitalize="sentences"
              maxLength={120}
              onSubmitEditing={handleSearchSubmit}
              accessibilityLabel="Search for a pickup address"
              helper={
                query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH
                  ? `Type at least ${MIN_SEARCH_LENGTH} characters to see suggestions.`
                  : undefined
              }
              right={
                <View style={styles.searchAdornment}>
                  {searching ? <Spinner size="small" /> : null}
                  {query.length > 0 ? (
                    <Pressable
                      onPress={clearSearch}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear address search"
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={20} color={t.colors.textFaint} />
                    </Pressable>
                  ) : null}
                </View>
              }
            />
          </Card>
          {searchProvider === 'google' ? (
            <AppText
              variant="caption"
              color="textFaint"
              style={styles.attribution}
              accessibilityLabel="Place data provided by Google Maps"
            >
              Google Maps
            </AppText>
          ) : null}
        </View>

        {showSuggestions ? (
          <View style={styles.section}>
            <SectionHeader title="Address suggestions" subtitle="Tap a result to move the pin." />
            <ListGroup>
              {searching ? (
                <ListRow
                  icon="search-outline"
                  title="Finding addresses…"
                  detail="Searching MediMove’s address service."
                  right={<Spinner size="small" />}
                  last
                />
              ) : suggestions.length > 0 ? (
                suggestions.map((result, index) => (
                  <ListRow
                    key={`${result.latitude}-${result.longitude}-${index}`}
                    icon="location-outline"
                    title={result.placeName || result.address}
                    detail={result.detail && result.detail !== result.placeName ? result.detail : result.address}
                    onPress={() => selectSuggestion(result)}
                    last={index === suggestions.length - 1}
                    accessibilityLabel={`Use ${result.address}`}
                  />
                ))
              ) : (
                <ListRow
                  icon="alert-circle-outline"
                  title="No addresses found"
                  detail="Try another name or drop a pin below."
                  last
                />
              )}
            </ListGroup>
          </View>
        ) : null}

        {searchError ? <Notice text={searchError} tone="warning" /> : null}

        <LocationCard
          label="Fast option"
          value="Use my current location"
          detail="You confirm the pin before any request is sent."
          icon="locate-outline"
          actionLabel={locating ? 'Locating…' : 'Use GPS'}
          onPress={() => void locateCurrentPosition()}
          selected={draft?.source === 'gps'}
          accessibilityLabel="Use my current location as pickup"
        />

        <View style={styles.mapWrap}>
          <MapCanvas
            markers={markers}
            height={190}
            caption={draft ? 'SELECTED PICKUP · confirm to use' : 'DROP A PIN OR USE GPS'}
            onPick={(coordinate) => void pickOnMap(coordinate)}
            accessibilityLabel="Tap the map to move the pickup pin"
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Pin and meeting point" subtitle="Refine the selected address or describe where to meet." />
          <Card style={styles.card}>
            <AppInput
              label="Address label"
              icon="business-outline"
              value={address}
              onChangeText={changeAddress}
              placeholder="Where should the crew meet you?"
            />
            <AppInput
              label="Nearby building or landmark"
              icon="location-outline"
              value={landmark}
              onChangeText={changeLandmark}
              placeholder="e.g. beside the pharmacy, opposite the main gate"
              helper={
                draft?.source === 'manual'
                  ? 'Required when you place the pin yourself.'
                  : 'Helps the crew find the exact meeting point.'
              }
            />
            <SecondaryButton
              label={manualOpen ? 'Hide coordinates' : 'Enter coordinates instead'}
              icon={manualOpen ? 'chevron-up-outline' : 'keypad-outline'}
              size="sm"
              onPress={() => setManualOpen((open) => !open)}
            />
            {manualOpen ? (
              <>
                <View style={styles.coords}>
                  <AppInput
                    label="Latitude"
                    value={latitude}
                    onChangeText={setLatitude}
                    placeholder="-9.0765"
                    keyboardType="decimal-pad"
                    autoCapitalize="none"
                    containerStyle={styles.coordField}
                  />
                  <AppInput
                    label="Longitude"
                    value={longitude}
                    onChangeText={setLongitude}
                    placeholder="7.3986"
                    keyboardType="decimal-pad"
                    autoCapitalize="none"
                    containerStyle={styles.coordField}
                  />
                </View>
                <SecondaryButton label="Apply coordinates" icon="location-outline" size="sm" onPress={applyCoordinates} />
              </>
            ) : null}
          </Card>
        </View>

        {error ? <Notice text={error} tone="danger" /> : null}

        {draft ? (
          <Card background="primarySoft" borderColor="primary" style={styles.selected}>
            <AppText variant="caption" color="primary">
              Selected pickup
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={2}>
              {draft.address}
            </AppText>
            {draft.landmark ? (
              <AppText variant="caption" color="textMuted" numberOfLines={2}>
                {draft.landmark}
              </AppText>
            ) : null}
          </Card>
        ) : null}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  section: { gap: 10 },
  card: { gap: 12 },
  mapWrap: { marginVertical: 2 },
  searchAdornment: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  coords: { flexDirection: 'row', gap: 10 },
  coordField: { flex: 1 },
  selected: { gap: 3 },
  attribution: { alignSelf: 'flex-end', paddingHorizontal: 2 },
  footer: { width: '100%' },
})

export default function LocationPickerScreen() {
  return (
    <RoleGate allow={['PATIENT']}>
      <LocationPickerContent />
    </RoleGate>
  )
}
