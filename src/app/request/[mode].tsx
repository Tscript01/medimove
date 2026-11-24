import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { RoleGate } from '@/components/RoleGate'
import { MapCanvas, type MapMarker } from '@/components/MapCanvas'
import {
  AppInput,
  AppText,
  Card,
  EmergencyButton,
  Notice,
  PrimaryButton,
  Screen,
  SectionHeader,
  SecondaryButton,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { bookingService, type CreateBookingInput } from '@/services/booking.service'
import { fleetService } from '@/services/fleet.service'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { useAppTheme } from '@/theme'
import type { EmergencyCategory, FleetProvider, RankedHospital } from '@/types'
import {
  EMERGENCY_CATEGORIES,
  emergencyCategoryLabel,
  formatNaira,
} from '@/utils/format'
import { makeIdempotencyKey } from '@/utils/id'

type TransportMode = 'emergency' | 'urgent' | 'routine'
type YesNoUnknown = 'unknown' | 'yes' | 'no'
type UrgencyGuidance = 'Critical' | 'High' | 'Moderate'

const MODE_COPY: Record<TransportMode, { title: string; description: string; button: string }> = {
  emergency: {
    title: 'Emergency Ambulance',
    description: 'For a medical emergency that needs an ambulance now.',
    button: 'Request Emergency Ambulance',
  },
  urgent: {
    title: 'Urgent Medical Transport',
    description: 'For care that cannot wait, without an emergency response.',
    button: 'Request Urgent Transport',
  },
  routine: {
    title: 'Routine Checkup',
    description: 'For a planned appointment or non-urgent medical travel.',
    button: 'Request Checkup Transport',
  },
}

const YES_NO_OPTIONS: { value: YesNoUnknown; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Not sure' },
]

function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string
  selected: boolean
  onPress: () => void
  accessibilityLabel?: string
}) {
  const t = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.chip,
        {
          minHeight: 44,
          paddingHorizontal: 14,
          borderRadius: t.radius.pill,
          borderColor: selected ? t.colors.primary : t.colors.border,
          backgroundColor: selected ? t.colors.primarySoft : t.colors.surface,
        },
      ]}
    >
      <AppText variant="label" color={selected ? 'primary' : 'text'}>
        {label}
      </AppText>
    </Pressable>
  )
}

function RequestContent() {
  const navigation = useSafeNavigation()
  const t = useAppTheme()
  const params = useLocalSearchParams<{ mode?: string | string[] }>()
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode
  const mode: TransportMode =
    rawMode === 'urgent' || rawMode === 'routine' ? rawMode : 'emergency'
  const copy = MODE_COPY[mode]
  const isEmergency = mode === 'emergency'

  const user = useAuthStore((state) => state.user)
  const pickup = useLocationStore((state) => state.pickup)
  const setPickup = useLocationStore((state) => state.setPickup)
  const pickupConfirmed = pickup?.confirmed === true

  const [category, setCategory] = useState<EmergencyCategory>('MEDICAL')
  const [urgency, setUrgency] = useState<UrgencyGuidance>('High')
  const [isForSelf, setIsForSelf] = useState(true)
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [relationship, setRelationship] = useState('')
  const [landmark, setLandmark] = useState(pickup?.landmark ?? '')
  const [callbackPhone, setCallbackPhone] = useState(user?.phone ?? '')
  const [whatHappened, setWhatHappened] = useState('')
  const [conscious, setConscious] = useState<YesNoUnknown>('unknown')
  const [breathing, setBreathing] = useState<YesNoUnknown>('unknown')
  const [crewNotes, setCrewNotes] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idempotencyRef = useRef<string | null>(null)

  const fleetState = useAsync(
    () => (pickup ? fleetService.getFleet(pickup.lat, pickup.lng) : Promise.resolve(null)),
    [pickup?.lat, pickup?.lng]
  )

  const hospitals = fleetState.data?.hospitals ?? []
  const providers = useMemo(
    () =>
      (fleetState.data?.data ?? []).filter(
        (provider) =>
          provider.availableStatus &&
          provider.status?.toUpperCase() === 'ACTIVE' &&
          provider.verificationStatus?.toUpperCase() === 'VERIFIED' &&
          !provider.isSimulated
      ),
    [fleetState.data]
  )

  const selectedHospital =
    hospitals.find((hospital) => hospital.id === selectedHospitalId) ??
    hospitals.find((hospital) => hospital.isRecommended) ??
    hospitals[0] ??
    null

  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ??
    providers.find((provider) => provider.isRecommended) ??
    providers[0] ??
    null

  const markers: MapMarker[] = useMemo(() => {
    const result: MapMarker[] = []
    if (pickup) {
      result.push({ id: 'pickup', latitude: pickup.lat, longitude: pickup.lng, kind: 'user', label: 'Pickup' })
    }
    if (selectedProvider) {
      result.push({
        id: 'provider',
        latitude: selectedProvider.latitude,
        longitude: selectedProvider.longitude,
        kind: 'ambulance',
        label: selectedProvider.name,
      })
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
  }, [pickup, selectedProvider, selectedHospital])

  const openLocationPicker = () => navigation.navigate('/location-picker')

  const submit = async () => {
    setError(null)

    if (!pickup || !pickupConfirmed) {
      setError('Confirm a pickup location before requesting transport.')
      return
    }
    if (!selectedProvider) {
      setError('No ambulance provider is currently available for this pickup. Check the pickup point or try again.')
      return
    }
    if (!selectedHospital) {
      setError('Choose a destination hospital before requesting transport.')
      return
    }
    if (callbackPhone.trim().length < 7) {
      setError('Enter a phone number dispatch can call.')
      return
    }
    if (!isForSelf && (!patientName.trim() || patientPhone.trim().length < 7)) {
      setError('Add the patient’s name and a contact phone number.')
      return
    }
    if (pickup.source === 'manual' && !landmark.trim()) {
      setError('Describe a nearby building or landmark for this pin.')
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
    setSubmitting(true)

    const noteLines: string[] = []
    if (mode !== 'emergency') noteLines.push(copy.title)
    if (isEmergency) noteLines.push(`Urgency guidance: ${urgency}`)
    if (whatHappened.trim()) noteLines.push(`What happened: ${whatHappened.trim()}`)
    if (conscious !== 'unknown') noteLines.push(`Patient conscious: ${conscious === 'yes' ? 'Yes' : 'No'}`)
    if (breathing !== 'unknown') noteLines.push(`Breathing normally: ${breathing === 'yes' ? 'Yes' : 'No'}`)
    if (relationship.trim()) noteLines.push(`Relationship to patient: ${relationship.trim()}`)
    if (crewNotes.trim()) noteLines.push(`Crew notes: ${crewNotes.trim()}`)

    const payload: CreateBookingInput = {
      providerId: selectedProvider.id,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: pickup.address,
      landmark: landmark.trim() || pickup.landmark,
      destinationHospitalId: selectedHospital.id,
      isForSelf,
      callbackPhone: callbackPhone.trim(),
      emergencyCategory: isEmergency || mode === 'urgent' ? category : 'MEDICAL',
      notes: noteLines.length > 0 ? noteLines.join('\n').slice(0, 1000) : undefined,
    }

    if (!isForSelf) {
      payload.patientName = patientName.trim()
      payload.patientPhone = patientPhone.trim()
    }

    if (!idempotencyRef.current) idempotencyRef.current = makeIdempotencyKey()
    payload.idempotencyKey = idempotencyRef.current

    try {
      const response = await bookingService.create(payload)
      setPickup({
        ...pickup,
        landmark: landmark.trim() || pickup.landmark,
      })
      idempotencyRef.current = null
      navigation.replace({ pathname: '/booking/[id]', params: { id: response.booking.id } })
    } catch (err) {
      setError((err as Error)?.message || 'The request could not be submitted. Check your connection and try again.')
      setSubmitting(false)
    }
  }

  const missingRequirements = [
    !pickupConfirmed ? 'confirm the pickup point' : null,
    !selectedHospital ? 'choose a destination hospital' : null,
    !selectedProvider ? 'have a verified, available ambulance service' : null,
    callbackPhone.trim().length < 7 ? 'enter a dispatch phone number' : null,
    !isForSelf && (!patientName.trim() || patientPhone.trim().length < 7)
      ? 'add the patient name and phone'
      : null,
    pickup?.source === 'manual' && !landmark.trim() ? 'describe the pickup landmark' : null,
  ].filter((item): item is string => Boolean(item))

  const footer = (
    <View style={styles.footerInner}>
      {error ? <Notice text={error} tone="danger" /> : null}
      {missingRequirements.length > 0 && !submitting ? (
        <AppText variant="micro" color="textMuted">
          Needed before requesting: {missingRequirements.join(' · ')}.
        </AppText>
      ) : null}
      {isEmergency ? (
        <EmergencyButton
          label={copy.button}
          onPress={() => void submit()}
          loading={submitting}
        />
      ) : (
        <PrimaryButton
          label={copy.button}
          icon="medical-outline"
          onPress={() => void submit()}
          loading={submitting}
        />
      )}
    </View>
  )

  return (
    <Screen
      scroll
      safeTop={false}
      avoidKeyboard
      footer={footer}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={fleetState.refreshing}
          onRefresh={fleetState.refresh}
          tintColor={t.colors.primary}
        />
      }
    >
      <View style={styles.headerBlock}>
        <AppText variant="title">{copy.title}</AppText>
        <AppText variant="caption" color="textMuted">
          {copy.description}
        </AppText>
      </View>

      {isEmergency ? (
        <Notice
          text="If life is in danger, the person is not breathing, or you cannot stay safe, call your local emergency number now. MediMove will process this request at the same time."
          tone="danger"
        />
      ) : null}

      <Card style={styles.card} borderColor={pickup ? 'border' : 'primary'}>
        <View style={styles.rowBetween}>
          <View style={styles.cardHeading}>
            <AppText variant="label" color="textMuted">
              {isForSelf ? 'PICKUP' : 'PATIENT PICKUP'}
            </AppText>
            <AppText variant="subheading" numberOfLines={2}>
              {pickup?.address ?? 'Confirm where to meet'}
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
          <Notice
            text="This location was found automatically but is not confirmed yet. Open the pickup screen to check it before requesting."
            tone="warning"
          />
        ) : null}
        <AppInput
          label="Nearby building or landmark"
          icon="business-outline"
          value={landmark}
          onChangeText={setLandmark}
          placeholder="e.g. beside the main gate"
          helper="Helps the crew find the exact meeting point."
        />
        <SecondaryButton
          label={
            pickupConfirmed
              ? isForSelf
                ? 'Change pickup point'
                : 'Change patient pickup'
              : isForSelf
                ? 'Confirm pickup point'
                : 'Confirm patient pickup'
          }
          icon="create-outline"
          size="sm"
          onPress={openLocationPicker}
        />
      </Card>

      {(isEmergency || mode === 'urgent') && hospitals.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Type of help" subtitle="Used to prepare the right response, not to decide dispatch priority." />
          <View style={styles.chips}>
            {EMERGENCY_CATEGORIES.map((value) => (
              <Chip
                key={value}
                label={emergencyCategoryLabel(value)}
                selected={category === value}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {})
                  setCategory(value)
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {isEmergency ? (
        <View style={styles.section}>
          <SectionHeader
            title="Urgency guidance"
            subtitle="Included as guidance only. Dispatch applies its own safety and operational rules."
          />
          <View style={styles.chipRow}>
            {(['Critical', 'High', 'Moderate'] as UrgencyGuidance[]).map((value) => (
              <Chip
                key={value}
                label={value}
                selected={urgency === value}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {})
                  setUrgency(value)
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Destination" subtitle="Hospitals ranked by distance from your pickup." />
        {fleetState.loading && !fleetState.data ? (
          <Notice text="Finding nearby hospitals and transport services…" />
        ) : fleetState.error ? (
          <Notice text={fleetState.error} tone="warning" actionLabel="Retry" onAction={fleetState.reload} />
        ) : hospitals.length === 0 ? (
          <Notice text="No destination hospitals were returned for this pickup. Move the pickup point or try again." tone="warning" />
        ) : (
          <View style={styles.optionList}>
            {hospitals.slice(0, 5).map((hospital: RankedHospital) => {
              const selected = selectedHospital?.id === hospital.id
              return (
                <Card
                  key={hospital.id}
                  onPress={() => setSelectedHospitalId(hospital.id)}
                  borderColor={selected ? 'primary' : 'border'}
                  background={selected ? 'primarySoft' : 'surface'}
                  accessibilityLabel={`Select ${hospital.name}`}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.cardHeading}>
                      <AppText variant="subheading" numberOfLines={1}>
                        {hospital.name}
                      </AppText>
                      <AppText variant="caption" color="textMuted">
                        {hospital.distanceKm.toFixed(1)} km away
                      </AppText>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} /> : null}
                  </View>
                </Card>
              )
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Transport service" subtitle="Nearby verified services from the server; availability can change." />
        <SecondaryButton
          label="Refresh nearby services"
          icon="refresh-outline"
          size="sm"
          onPress={fleetState.refresh}
          loading={fleetState.loading && Boolean(fleetState.data)}
        />
        {providers.length === 0 && !fleetState.loading ? (
          <Notice
            text="No verified, available ambulance service is currently reported for this pickup. Seeded or unverified providers cannot be used. Move the pickup point or try again."
            tone="warning"
          />
        ) : (
          <View style={styles.optionList}>
            {providers.slice(0, 4).map((provider: FleetProvider) => {
              const selected = selectedProvider?.id === provider.id
              return (
                <Card
                  key={provider.id}
                  onPress={() => setSelectedProviderId(provider.id)}
                  borderColor={selected ? 'primary' : 'border'}
                  background={selected ? 'primarySoft' : 'surface'}
                  accessibilityLabel={`Select ${provider.name}`}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.cardHeading}>
                      <AppText variant="subheading" numberOfLines={1}>
                        {provider.name}
                      </AppText>
                      <AppText variant="caption" color="textMuted" numberOfLines={1}>
                        {provider.vehicleType} · estimated {formatNaira(provider.initialFareKobo)}
                      </AppText>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={t.colors.primary} /> : null}
                  </View>
                </Card>
              )
            })}
          </View>
        )}
        <AppText variant="micro" color="textMuted">
          Final fare is set by dispatch. No price is sent with your request.
        </AppText>
      </View>

      <View style={styles.section}>
        <MapCanvas
          markers={markers}
          height={180}
          caption="Pickup, chosen destination and service"
          accessibilityLabel="Map showing your pickup, destination and selected transport service"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Who needs transport?" />
        <View style={styles.chipRow}>
          <Chip label="Myself" selected={isForSelf} onPress={() => setIsForSelf(true)} />
          <Chip label="Someone else" selected={!isForSelf} onPress={() => setIsForSelf(false)} />
        </View>
        {!isForSelf ? (
          <Card style={styles.card}>
            <AppInput
              label="Patient name"
              icon="person-outline"
              value={patientName}
              onChangeText={setPatientName}
              placeholder="If known"
              autoCapitalize="words"
            />
            <AppInput
              label="Patient phone"
              icon="call-outline"
              value={patientPhone}
              onChangeText={setPatientPhone}
              placeholder="If available"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <AppInput
              label="Relationship (optional)"
              icon="people-outline"
              value={relationship}
              onChangeText={setRelationship}
              placeholder="e.g. mother, neighbour"
            />
            <Notice text="The patient should be at the pickup point you confirmed above." tone="info" />
          </Card>
        ) : null}
      </View>

      <View style={styles.section}>
        <AppInput
          label="Phone for dispatch to call"
          icon="call-outline"
          value={callbackPhone}
          onChangeText={setCallbackPhone}
          keyboardType="phone-pad"
          autoCapitalize="none"
          placeholder="Your contact number"
        />
      </View>

      <Pressable
        onPress={() => setShowOptional((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showOptional }}
        accessibilityLabel={showOptional ? 'Hide optional details' : 'Add optional details'}
        style={[styles.optionalToggle, { borderColor: t.colors.border, borderRadius: t.radius.md }]}
      >
        <View>
          <AppText variant="bodyStrong">Optional details for the crew</AppText>
          <AppText variant="caption" color="textMuted">
            What happened, consciousness, breathing and notes.
          </AppText>
        </View>
        <Ionicons name={showOptional ? 'chevron-up' : 'chevron-down'} size={20} color={t.colors.textMuted} />
      </Pressable>

      {showOptional ? (
        <Card style={styles.card}>
          <AppInput
            label="What happened"
            value={whatHappened}
            onChangeText={setWhatHappened}
            placeholder="Brief description"
            multiline
            numberOfLines={3}
          />
          <View style={styles.question}>
            <AppText variant="label" color="textMuted">
              Patient conscious
            </AppText>
            <View style={styles.chipRow}>
              {YES_NO_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={conscious === option.value}
                  onPress={() => setConscious(option.value)}
                />
              ))}
            </View>
          </View>
          <View style={styles.question}>
            <AppText variant="label" color="textMuted">
              Breathing normally
            </AppText>
            <View style={styles.chipRow}>
              {YES_NO_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={breathing === option.value}
                  onPress={() => setBreathing(option.value)}
                />
              ))}
            </View>
          </View>
          <AppInput
            label="Crew notes"
            value={crewNotes}
            onChangeText={setCrewNotes}
            placeholder="Anything else the crew should know"
            multiline
            numberOfLines={3}
          />
        </Card>
      ) : null}

      {isEmergency ? (
        <Notice text="Do not wait for these details to call local emergency services if life is in danger." tone="warning" />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24 },
  headerBlock: { gap: 4 },
  card: { gap: 14 },
  section: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  optionList: { gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardHeading: { flex: 1, gap: 2 },
  question: { gap: 8 },
  optionalToggle: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerInner: { gap: 10 },
})

export default function RequestScreen() {
  return (
    <RoleGate allow={['PATIENT']}>
      <RequestContent />
    </RoleGate>
  )
}
