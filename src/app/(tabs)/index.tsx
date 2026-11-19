import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { TrackingMap, type MapMarker } from '@/components/TrackingMap'
import {
  AmbulanceStatusCard,
  AppInput,
  AppText,
  Card,
  EmergencyButton,
  EmptyState,
  ErrorState,
  LoadingState,
  LocationCard,
  Notice,
  Screen,
  SectionHeader,
  TripSummaryCard,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { bookingService } from '@/services/booking.service'
import { fleetService } from '@/services/fleet.service'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { useAppTheme } from '@/theme'
import type { EmergencyCategory, RankedHospital } from '@/types'
import {
  EMERGENCY_CATEGORIES,
  emergencyCategoryLabel,
  formatDate,
  formatDistance,
  formatNaira,
  formatNairaFromNaira,
} from '@/utils/format'
import { makeIdempotencyKey } from '@/utils/id'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const router = useRouter()
  const t = useAppTheme()
  const user = useAuthStore((state) => state.user)
  const pickup = useLocationStore((state) => state.pickup)
  const setPickup = useLocationStore((state) => state.setPickup)

  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string | null>(null)

  const [category, setCategory] = useState<EmergencyCategory>('MEDICAL')
  const [hospitalChoice, setHospitalChoice] = useState<string | null>(null)
  const [providerChoice, setProviderChoice] = useState<string | null>(null)
  const [callbackPhone, setCallbackPhone] = useState(user?.phone ?? '')
  const [isForSelf, setIsForSelf] = useState(true)
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openLocationPicker = useCallback(() => {
    router.push('/location-picker')
  }, [router])

  /* ------------------------------- Location -------------------------------- */

  const requestLocation = useCallback(async () => {
    setLocating(true)
    setLocationNote(null)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocationNote('Location permission is off. Choose a pickup point manually.')
        return
      }

      let position: Location.LocationObject | null = null
      try {
        position = await Location.getLastKnownPositionAsync({ maxAge: 60_000 })
      } catch {
        // No cached fix; fall through to a fresh one.
      }
      if (!position) {
        position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ])
      }

      if (position) {
        setPickup({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: 'Current location',
          source: 'gps',
        })
      } else {
        setLocationNote('No GPS fix yet. Choose a pickup point manually.')
      }
    } catch {
      setLocationNote('Location is unavailable. Choose a pickup point manually.')
    } finally {
      setLocating(false)
    }
  }, [setPickup])

  // Initial GPS lookup is an Effect event: it is triggered by mount, while the
  // same callback remains available to the UI's "Use my location" action.
  const locateOnMount = useEffectEvent(() => {
    if (!useLocationStore.getState().pickup) void requestLocation()
  })

  useEffect(() => {
    void Promise.resolve().then(() => locateOnMount())
  }, [])

  /* --------------------------------- Fleet --------------------------------- */

  const coords = useMemo(
    () => (pickup ? { lat: pickup.lat, lng: pickup.lng } : null),
    [pickup]
  )

  const fleetState = useAsync(async () => {
    if (!coords) return null
    return fleetService.getFleet(coords.lat, coords.lng)
  }, [coords?.lat, coords?.lng])

  const recentState = useAsync(() => bookingService.list({ limit: 1 }), [])
  const recentBooking = recentState.data?.bookings?.[0] ?? null

  const hospitals = fleetState.data?.hospitals
  const providers = fleetState.data?.data
  const serverAddress = fleetState.data?.userLocation?.pickupAddress
  const pickupAddress = pickup?.source === 'gps'
    ? serverAddress ?? pickup.address
    : pickup?.address ?? serverAddress ?? 'Your current location'

  // Defaults are derived, not written back into state, so a fleet refresh
  // never triggers an extra render just to re-select the recommended option.
  const hospitalId = hospitalChoice ?? (hospitals?.find((h) => h.isRecommended) ?? hospitals?.[0])?.id ?? null
  const providerId = providerChoice ?? (providers?.find((p) => p.isRecommended) ?? providers?.[0])?.id ?? null

  const selectedHospital: RankedHospital | null = hospitals?.find((h) => h.id === hospitalId) ?? null
  const selectedProvider = providers?.find((p) => p.id === providerId) ?? null

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = []
    if (coords) list.push({ id: 'me', latitude: coords.lat, longitude: coords.lng, kind: 'user', label: 'You' })
    if (selectedProvider) {
      list.push({
        id: selectedProvider.id,
        latitude: selectedProvider.latitude,
        longitude: selectedProvider.longitude,
        kind: 'ambulance',
        label: selectedProvider.vehicleType,
      })
    }
    if (selectedHospital) {
      list.push({
        id: selectedHospital.id,
        latitude: selectedHospital.lat,
        longitude: selectedHospital.lng,
        kind: 'hospital',
        label: 'Hospital',
      })
    }
    return list
  }, [coords, selectedProvider, selectedHospital])

  const route = useMemo(() => {
    if (!coords || !selectedProvider) return []
    return [
      { latitude: selectedProvider.latitude, longitude: selectedProvider.longitude },
      { latitude: coords.lat, longitude: coords.lng },
    ]
  }, [coords, selectedProvider])

  /* -------------------------------- Dispatch ------------------------------- */

  const handleDispatch = async () => {
    if (!coords || !selectedProvider || !selectedHospital) {
      setError('Choose a pickup point, then wait for nearby ambulances to load.')
      return
    }
    if (!callbackPhone.trim()) {
      setError('Add a phone number the crew can call you on.')
      return
    }
    if (!isForSelf && (!patientName.trim() || !patientPhone.trim())) {
      setError('Add the patient’s name and phone number.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await bookingService.create({
        providerId: selectedProvider.id,
        pickupLat: coords.lat,
        pickupLng: coords.lng,
        pickupAddress,
        destinationHospitalId: selectedHospital.id,
        destAddress: selectedHospital.name,
        callbackPhone: callbackPhone.trim(),
        emergencyCategory: category,
        isForSelf,
        patientName: isForSelf ? undefined : patientName.trim(),
        patientPhone: isForSelf ? undefined : patientPhone.trim(),
        notes: notes.trim() || undefined,
        idempotencyKey: makeIdempotencyKey(),
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.push({ pathname: '/booking/[id]', params: { id: res.booking.id } })
    } catch (err) {
      setError((err as Error).message || 'We could not dispatch an ambulance. Please try again.')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setSubmitting(false)
    }
  }

  const busy = locating || (fleetState.loading && !fleetState.data)
  const hasFleet = Boolean(providers?.length)
  const firstName = user?.fullName?.trim().split(/\s+/)[0]

  return (
    <Screen safeTop padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: t.spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.greeting}>
          <View style={styles.greetingText}>
            <AppText variant="caption" color="textMuted">
              {greeting()}
            </AppText>
            <AppText variant="title">{firstName ? `${greeting()}, ${firstName}` : 'Need help?'}</AppText>
          </View>
          <Pressable
            onPress={openLocationPicker}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Change pickup location"
            style={[styles.locationButton, { backgroundColor: t.colors.primarySoft, borderRadius: t.radius.pill }]}
          >
            <Ionicons name="locate-outline" size={20} color={t.colors.primary} />
          </Pressable>
        </View>

        <LocationCard
          label="Pickup location"
          value={pickup ? pickup.address : 'Set your pickup point'}
          detail={pickup ? (pickup.source === 'gps' ? 'From device GPS' : 'Manually selected') : 'Required before dispatch'}
          icon="location-outline"
          actionLabel="Change"
          onPress={openLocationPicker}
        />

        {locationNote ? (
          <View style={styles.note}>
            <Notice
              text={locationNote}
              tone="warning"
            />
            <AppText variant="caption" color="primary" onPress={openLocationPicker}>
              Choose manually
            </AppText>
          </View>
        ) : null}

        <Card style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: t.colors.emergencySoft }]}>
            <Ionicons name="medical" size={24} color={t.colors.emergency} />
          </View>
          <View style={styles.heroText}>
            <AppText variant="heading">Emergency transport</AppText>
            <AppText variant="caption" color="textMuted">
              Tell us what happened, choose a hospital, and we&apos;ll send the request.
            </AppText>
          </View>
        </Card>

        <View style={styles.mapWrap}>
          <TrackingMap
            markers={markers}
            route={route}
            height={170}
            caption={
              selectedProvider
                ? `${selectedProvider.vehicleType} · ${formatDistance(selectedProvider.proximityKm)} away`
                : hasFleet
                  ? `${providers!.length} AMBULANCES NEARBY`
                  : 'WAITING FOR PICKUP'
            }
          />
        </View>

        {!coords ? (
          <ErrorState
            title="Pickup location needed"
            message="Allow location access or choose a pickup point manually to see nearby ambulances."
            actionLabel="Choose location"
            onAction={openLocationPicker}
          />
        ) : busy ? (
          <LoadingState message="Finding nearby ambulances…" />
        ) : fleetState.error ? (
          <ErrorState
            title="Couldn't load nearby services"
            message={fleetState.error}
            actionLabel="Try again"
            onAction={fleetState.reload}
          />
        ) : !hasFleet ? (
          <EmptyState
            icon="location-outline"
            title="No ambulances in range"
            message="Try a different pickup point or check again in a moment."
            actionLabel="Change pickup point"
            onAction={openLocationPicker}
          />
        ) : (
          <>
            <SectionHeader title="What's happening?" subtitle="Pick the closest match" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {EMERGENCY_CATEGORIES.map((item) => {
                const active = item === category
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {})
                      setCategory(item)
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={emergencyCategoryLabel(item)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? t.colors.primary : t.colors.surface,
                        borderColor: active ? t.colors.primary : t.colors.border,
                      },
                    ]}
                  >
                    <AppText variant="label" color={active ? 'onPrimary' : 'textMuted'}>
                      {emergencyCategoryLabel(item)}
                    </AppText>
                  </Pressable>
                )
              })}
            </ScrollView>

            <SectionHeader title="Take me to" subtitle="Ranked by proximity" />
            <View style={styles.list}>
              {hospitals?.slice(0, 5).map((hospital) => (
                <LocationCard
                  key={hospital.id}
                  label={hospital.isRecommended ? 'Nearest hospital' : 'Hospital'}
                  value={hospital.name}
                  detail={`${hospital.city} · ${formatDistance(hospital.distanceKm)}`}
                  icon="business-outline"
                  selected={hospital.id === hospitalId}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {})
                    setHospitalChoice(hospital.id)
                  }}
                />
              ))}
            </View>

            <SectionHeader title="Choose an ambulance" subtitle="Fares are set by dispatch" />
            <View style={styles.list}>
              {providers?.map((provider) => (
                <AmbulanceStatusCard
                  key={provider.id}
                  name={provider.name}
                  vehicleType={provider.vehicleType}
                  detail={formatDistance(provider.proximityKm)}
                  badgeLabel={provider.isRecommended ? 'Nearest' : undefined}
                  selected={provider.id === providerId}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {})
                    setProviderChoice(provider.id)
                  }}
                  right={
                    <View style={styles.fareBlock}>
                      <AppText variant="bodyStrong" color={provider.id === providerId ? 'primary' : 'text'}>
                        {formatNairaFromNaira(provider.initialFareNGN)}
                      </AppText>
                      <AppText variant="micro" color="textFaint">
                        STARTING FARE
                      </AppText>
                    </View>
                  }
                />
              ))}
            </View>

            <SectionHeader title="Patient details" subtitle="For the responding crew" />
            <Card style={styles.detailsCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <AppText variant="bodyStrong">This request is for me</AppText>
                  <AppText variant="caption" color="textMuted">
                    Turn off if you&apos;re requesting for someone else.
                  </AppText>
                </View>
                <Switch
                  value={isForSelf}
                  onValueChange={(value) => {
                    Haptics.selectionAsync().catch(() => {})
                    setIsForSelf(value)
                  }}
                  trackColor={{ false: t.colors.borderStrong, true: t.colors.primary }}
                  thumbColor={t.colors.surface}
                  ios_backgroundColor={t.colors.borderStrong}
                  accessibilityLabel="This request is for me"
                />
              </View>

              {!isForSelf ? (
                <>
                  <AppInput
                    label="Patient's name"
                    value={patientName}
                    onChangeText={setPatientName}
                    placeholder="Full name"
                    autoCapitalize="words"
                  />
                  <AppInput
                    label="Patient's phone"
                    icon="call-outline"
                    value={patientPhone}
                    onChangeText={setPatientPhone}
                    placeholder="+234 801 234 5678"
                    keyboardType="phone-pad"
                  />
                </>
              ) : null}

              <AppInput
                label="Crew callback number"
                icon="call-outline"
                value={callbackPhone}
                onChangeText={setCallbackPhone}
                placeholder="+234 801 234 5678"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <AppInput
                label="Notes for the crew (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Landmark, access code, symptoms…"
                multiline
                numberOfLines={3}
              />
            </Card>
          </>
        )}

        {recentBooking ? (
          <>
            <SectionHeader title="Recent trip" subtitle="Your latest request" />
            <TripSummaryCard
              reference={recentBooking.reference}
              status={recentBooking.status}
              pickup={recentBooking.pickupAddress || 'Your location'}
              destination={recentBooking.destAddress || 'Destination'}
              amount={formatNaira(recentBooking.estimatedFare)}
              meta={formatDate(recentBooking.createdAt)}
              onPress={() => router.push({ pathname: '/booking/[id]', params: { id: recentBooking.id } })}
            />
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: t.colors.bgElevated, borderTopColor: t.colors.border }]}>
        <View style={styles.fareRow}>
          <View>
            <AppText variant="caption" color="textMuted">
              Server-estimated fare
            </AppText>
            <AppText variant="micro" color="textFaint">
              Final fare is set by dispatch
            </AppText>
          </View>
          <AppText variant="heading" color="primary">
            {formatNairaFromNaira(selectedProvider?.initialFareNGN ?? 0)}
          </AppText>
        </View>

        {error ? <Notice text={error} tone="danger" /> : null}

        <EmergencyButton
          label="Dispatch ambulance"
          onPress={handleDispatch}
          loading={submitting}
          disabled={!hasFleet || !selectedProvider || !selectedHospital}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  greeting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  greetingText: { flex: 1, gap: 2 },
  locationButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  note: { gap: 4 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: 4 },
  mapWrap: { marginTop: 0 },
  chips: { marginHorizontal: -20, paddingHorizontal: 20 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  list: { gap: 8 },
  fareBlock: { alignItems: 'flex-end', minWidth: 74, gap: 2 },
  detailsCard: { gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1, gap: 2 },
  detailField: { gap: 4 },
  detailFieldsRow: { flexDirection: 'row', gap: 12 },
  detailFieldFlex: { flex: 1, gap: 4 },
  patientInputs: { gap: 12 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  fareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
})
