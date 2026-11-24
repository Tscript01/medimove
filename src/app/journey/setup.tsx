import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { RoleGate } from '@/components/RoleGate'
import { MapCanvas, type MapMarker } from '@/components/MapCanvas'
import {
  AppText,
  Card,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { fleetService } from '@/services/fleet.service'
import { useJourneyStore, type JourneyPhase } from '@/store/journeyStore'
import { useLocationStore } from '@/store/locationStore'
import { useAppTheme } from '@/theme'
import type { RankedHospital } from '@/types'

const PHASES: { value: JourneyPhase; label: string; detail: string; icon: 'car-sport-outline' | 'navigate-outline' }[] = [
  {
    value: 'about-to-start',
    label: 'About to start',
    detail: 'I am leaving shortly.',
    icon: 'car-sport-outline',
  },
  {
    value: 'travelling',
    label: 'Already travelling',
    detail: 'I am on the way now.',
    icon: 'navigate-outline',
  },
]

function JourneySetupContent() {
  const navigation = useSafeNavigation()
  const t = useAppTheme()
  const pickup = useLocationStore((state) => state.pickup)
  const pickupConfirmed = pickup?.confirmed === true
  const journey = useJourneyStore((state) => state.session)
  const startJourney = useJourneyStore((state) => state.start)

  const [phase, setPhase] = useState<JourneyPhase | null>(null)
  const [hospitalId, setHospitalId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fleetState = useAsync(
    () => (pickup ? fleetService.getFleet(pickup.lat, pickup.lng) : Promise.resolve(null)),
    [pickup?.lat, pickup?.lng]
  )

  const hospitals = fleetState.data?.hospitals ?? []
  const selectedHospital =
    hospitals.find((hospital) => hospital.id === hospitalId) ??
    hospitals.find((hospital) => hospital.isRecommended) ??
    hospitals[0] ??
    null

  const markers: MapMarker[] = useMemo(() => {
    const result: MapMarker[] = []
    if (pickup) {
      result.push({ id: 'pickup', latitude: pickup.lat, longitude: pickup.lng, kind: 'user', label: 'Starting point' })
    }
    if (selectedHospital) {
      result.push({
        id: 'hospital',
        latitude: selectedHospital.lat,
        longitude: selectedHospital.lng,
        kind: 'hospital',
        label: selectedHospital.name,
      })
    }
    return result
  }, [pickup, selectedHospital])

  const start = () => {
    setError(null)

    if (!pickup || !pickupConfirmed) {
      setError('Confirm your current location before starting a journey.')
      return
    }
    if (!phase) {
      setError('Choose whether you have already started travelling.')
      return
    }
    if (!selectedHospital) {
      setError('Choose the hospital you are travelling to.')
      return
    }

    Haptics.selectionAsync().catch(() => {})
    startJourney({
      phase,
      pickup,
      destination: {
        id: selectedHospital.id,
        name: selectedHospital.name,
        address: `${selectedHospital.name}, ${selectedHospital.city}`,
        latitude: selectedHospital.lat,
        longitude: selectedHospital.lng,
      },
    })
    navigation.replace('/journey/live')
  }

  return (
    <Screen
      scroll
      safeTop={false}
      footer={
        <View style={styles.footer}>
          {error ? <Notice text={error} tone="danger" /> : null}
          <PrimaryButton
            label="Start journey tracking"
            icon="play-outline"
            onPress={start}
            disabled={!pickupConfirmed || !phase || !selectedHospital}
          />
        </View>
      }
      contentContainerStyle={styles.content}
    >
      <Notice
        text="This is for a private car, family vehicle, hired driver or ambulance arranged outside MediMove. It does not dispatch a MediMove ambulance."
        tone="info"
      />
      <Notice
        text="Tracking stays on this phone for now. Live sharing with a trusted contact needs a backend journey service that is not available yet."
        tone="warning"
      />

      {journey?.status === 'active' ? (
        <Card borderColor="primary" background="primarySoft">
          <AppText variant="subheading">A journey is already active</AppText>
          <AppText variant="caption" color="textMuted">
            Open it to see your latest position or stop tracking.
          </AppText>
          <SecondaryButton label="Open live journey" icon="navigate-outline" size="sm" onPress={() => navigation.navigate('/journey/live')} />
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Current location" subtitle="Confirm where this journey starts." />
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.cardHeading}>
              <AppText variant="label" color="textMuted">
                STARTING POINT
              </AppText>
              <AppText variant="subheading" numberOfLines={2}>
                {pickup?.address ?? 'No confirmed location'}
              </AppText>
              {pickup?.landmark ? (
                <AppText variant="caption" color="textMuted" numberOfLines={1}>
                  {pickup.landmark}
                </AppText>
              ) : null}
            </View>
            <Ionicons name="location-outline" size={20} color={t.colors.primary} />
          </View>
          {!pickupConfirmed ? (
            <Notice text="This location was found automatically. Confirm it before starting tracking." tone="warning" />
          ) : null}
          <SecondaryButton
            label={pickupConfirmed ? 'Change starting point' : 'Confirm starting point'}
            icon="create-outline"
            size="sm"
            onPress={() => navigation.navigate('/location-picker')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Are you travelling now?" />
        <View style={styles.phaseList}>
          {PHASES.map((option) => {
            const selected = phase === option.value
            return (
              <Pressable
                key={option.value}
                onPress={() => setPhase(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={option.label}
                style={[
                  styles.phase,
                  {
                    minHeight: 64,
                    borderColor: selected ? t.colors.primary : t.colors.border,
                    backgroundColor: selected ? t.colors.primarySoft : t.colors.surface,
                    borderRadius: t.radius.md,
                  },
                ]}
              >
                <Ionicons name={option.icon} size={20} color={selected ? t.colors.primary : t.colors.textMuted} />
                <View style={styles.cardHeading}>
                  <AppText variant="bodyStrong">{option.label}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {option.detail}
                  </AppText>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} /> : null}
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Destination hospital" subtitle="Hospitals ranked by distance from your starting point." />
        {!pickupConfirmed ? (
          <Notice text="Confirm your starting point to see nearby hospitals." tone="warning" />
        ) : fleetState.loading && !fleetState.data ? (
          <Notice text="Finding nearby hospitals…" />
        ) : fleetState.error ? (
          <Notice text={fleetState.error} tone="warning" actionLabel="Retry" onAction={fleetState.reload} />
        ) : hospitals.length === 0 ? (
          <Notice text="No hospitals were returned for this starting point." tone="warning" />
        ) : (
          <View style={styles.optionList}>
            {hospitals.slice(0, 6).map((hospital: RankedHospital) => {
              const selected = selectedHospital?.id === hospital.id
              return (
                <Pressable
                  key={hospital.id}
                  onPress={() => setHospitalId(hospital.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Select ${hospital.name}`}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? t.colors.primary : t.colors.border,
                      backgroundColor: selected ? t.colors.primarySoft : t.colors.surface,
                      borderRadius: t.radius.md,
                    },
                  ]}
                >
                  <View style={styles.cardHeading}>
                    <AppText variant="subheading" numberOfLines={1}>
                      {hospital.name}
                    </AppText>
                    <AppText variant="caption" color="textMuted">
                      {hospital.city} · {hospital.distanceKm.toFixed(1)} km away
                    </AppText>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} /> : null}
                </Pressable>
              )
            })}
          </View>
        )}
      </View>

      <MapCanvas
        markers={markers}
        height={180}
        caption="Starting point and chosen hospital"
        accessibilityLabel="Map showing your journey start and destination hospital"
      />

      <AppText variant="micro" color="textMuted">
        Updates need the app open and location permission. No ETA is shown because reliable routing data is not available for independent journeys.
      </AppText>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24 },
  section: { gap: 12 },
  card: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardHeading: { flex: 1, gap: 2 },
  phaseList: { gap: 10 },
  phase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionList: { gap: 10 },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { gap: 10 },
})

export default function JourneySetupScreen() {
  return (
    <RoleGate allow={['PATIENT']}>
      <JourneySetupContent />
    </RoleGate>
  )
}
