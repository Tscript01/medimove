import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as Location from 'expo-location'
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { MapCanvas, type MapMarker } from '@/components/MapCanvas'
import {
  AppText,
  Avatar,
  Badge,
  BottomSheet,
  Card,
  ConfirmationSheet,
  EmergencyButton,
  Notice,
  PrimaryButton,
  Screen,
  StatusBadge,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { bookingService } from '@/services/booking.service'
import { locationService } from '@/services/location.service'
import { useAuthStore } from '@/store/authStore'
import { useJourneyStore } from '@/store/journeyStore'
import { useLocationStore } from '@/store/locationStore'
import { useAppTheme } from '@/theme'
import { bookingStatusMeta, formatDateTime, isActiveBookingStatus } from '@/utils/format'

const GPS_TIMEOUT_MS = 9000

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const navigation = useSafeNavigation()
  const t = useAppTheme()
  const user = useAuthStore((state) => state.user)
  const pickup = useLocationStore((state) => state.pickup)
  const setPickup = useLocationStore((state) => state.setPickup)
  const journey = useJourneyStore((state) => state.session)

  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string | null>(null)
  const [transportSheetOpen, setTransportSheetOpen] = useState(false)
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false)

  const openLocationPicker = useCallback(() => {
    navigation.navigate('/location-picker')
  }, [navigation])

  const requestLocation = useCallback(async () => {
    setLocating(true)
    setLocationNote(null)
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setLocationNote('Location permission is off. Choose a pickup point manually.')
        return
      }

      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), GPS_TIMEOUT_MS)),
      ])

      if (!position) {
        setLocationNote('No GPS fix yet. Choose a pickup point manually.')
        return
      }

      const age = Date.now() - position.timestamp
      if (age > 120_000) {
        setLocationNote('The device location is out of date. Choose a pickup point manually.')
        return
      }

      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      let address = 'Current location'

      try {
        const response = await locationService.reverse(latitude, longitude)
        if (response.result?.address) address = response.result.address
      } catch {
        // Coordinates remain usable; the UI still shows a readable label.
      }

      setPickup({ lat: latitude, lng: longitude, address, source: 'gps', confirmed: false })
    } catch {
      setLocationNote('Location is unavailable. Choose a pickup point manually.')
    } finally {
      setLocating(false)
    }
  }, [setPickup])

  const locateOnMount = useEffectEvent(() => {
    if (!useLocationStore.getState().pickup) void requestLocation()
  })

  useEffect(() => {
    void Promise.resolve().then(() => locateOnMount())
  }, [])

  const bookingsState = useAsync(() => bookingService.list({ limit: 10 }), [])
  const activeRequest = useMemo(
    () => (bookingsState.data?.bookings ?? []).find((booking) => isActiveBookingStatus(booking.status)) ?? null,
    [bookingsState.data]
  )

  const activeRequestId = activeRequest?.id
  const refreshActiveRequest = bookingsState.refresh
  useEffect(() => {
    if (!activeRequestId) return
    const interval = setInterval(() => void refreshActiveRequest(), 10_000)
    return () => clearInterval(interval)
  }, [activeRequestId, refreshActiveRequest])

  const activeJourney = journey?.status === 'active' ? journey : null
  const firstName = user?.fullName?.trim().split(/\s+/)[0]
  const statusMeta = activeRequest ? bookingStatusMeta(activeRequest.status) : null

  const markers: MapMarker[] = useMemo(() => {
    if (!pickup) return []
    return [{ id: 'pickup', latitude: pickup.lat, longitude: pickup.lng, kind: 'user', label: 'Pickup' }]
  }, [pickup])

  const mapCaption = pickup
    ? pickup.confirmed
      ? 'Confirmed pickup point'
      : 'GPS · confirm before requesting'
    : locating
      ? 'Finding your location…'
      : locationNote
        ? 'LOCATION NEEDED'
        : 'SET A PICKUP POINT'

  const openRequest = (mode: 'emergency' | 'urgent' | 'routine') => {
    Haptics.selectionAsync().catch(() => {})
    setTransportSheetOpen(false)
    navigation.navigate({ pathname: '/request/[mode]', params: { mode } })
  }

  const handleEmergencyPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
    if (activeRequest) {
      setDuplicateWarningOpen(true)
      return
    }
    openRequest('emergency')
  }

  return (
    <Screen padded={false}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: t.spacing.md }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={bookingsState.refreshing}
            onRefresh={bookingsState.refresh}
            tintColor={t.colors.primary}
          />
        }
      >
        <View style={styles.greeting}>
          <View style={styles.greetingText}>
            <AppText variant="caption" color="textMuted">
              {greeting()}
            </AppText>
            <AppText variant="display" numberOfLines={1}>
              {firstName ? `${firstName}, where to?` : 'Where do you need to go?'}
            </AppText>
          </View>
          <Pressable
            onPress={() => bookingsState.refresh()}
            accessibilityRole="button"
            accessibilityLabel="Refresh requests"
            style={styles.refreshButton}
          >
            <Ionicons name="refresh-outline" size={20} color={t.colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('/(tabs)/profile')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Avatar name={user?.fullName ?? 'Guest'} size={42} />
          </Pressable>
        </View>

        <View style={styles.mapWrap}>
          <MapCanvas
            markers={markers}
            height={232}
            caption={mapCaption}
            accessibilityLabel={pickup ? `Map showing pickup at ${pickup.address}` : 'Map awaiting pickup location'}
          />
          <Pressable
            onPress={openLocationPicker}
            accessibilityRole="button"
            accessibilityLabel="Edit pickup location"
            style={[styles.mapEdit, { backgroundColor: t.colors.bgElevated, borderRadius: t.radius.pill }]}
          >
            <Ionicons name="create-outline" size={16} color={t.colors.primary} />
            <AppText variant="label" color="primary">
              Edit
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => void requestLocation()}
            disabled={locating}
            accessibilityRole="button"
            accessibilityLabel={locating ? 'Finding your current location' : 'Use my current location'}
            accessibilityState={{ disabled: locating, busy: locating }}
            style={[
              styles.mapLocate,
              {
                backgroundColor: t.colors.surface,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
              },
            ]}
          >
            <Ionicons name="locate-outline" size={20} color={t.colors.primary} />
          </Pressable>
        </View>

        <Pressable
          onPress={openLocationPicker}
          accessibilityRole="button"
          accessibilityLabel={`Pickup location: ${pickup?.address ?? 'not set'}. Change pickup location`}
          style={[styles.pickupRow, { backgroundColor: t.colors.surface, borderColor: t.colors.border, borderRadius: t.radius.md }]}
        >
          <View style={[styles.pickupIcon, { backgroundColor: t.colors.primarySoft, borderRadius: t.radius.sm }]}>
            <Ionicons name="location-outline" size={19} color={t.colors.primary} />
          </View>
          <View style={styles.pickupText}>
            <AppText variant="label" color="textMuted">
              PICKUP
            </AppText>
            <AppText variant="body" numberOfLines={1}>
              {pickup?.address ?? 'Set your pickup point'}
            </AppText>
            {pickup?.landmark ? (
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                {pickup.landmark}
              </AppText>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
        </Pressable>

        {locationNote ? (
          <Notice
            text={locationNote}
            tone="warning"
            actionLabel="Choose manually"
            onAction={openLocationPicker}
          />
        ) : null}

        {activeRequest && statusMeta ? (
          <Card
            onPress={() => navigation.navigate({ pathname: '/booking/[id]', params: { id: activeRequest.id } })}
            accessibilityLabel={`Active request ${activeRequest.reference}, ${statusMeta.label}. Open tracking`}
            borderColor="primary"
            style={styles.activeCard}
          >
            <View style={styles.activeTop}>
              <View style={styles.activeHeading}>
                <AppText variant="label" color="textMuted">
                  ACTIVE REQUEST · {activeRequest.reference}
                </AppText>
                <AppText variant="subheading" numberOfLines={1}>
                  {statusMeta.label}
                </AppText>
              </View>
              <StatusBadge status={activeRequest.status} />
            </View>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {activeRequest.pickupAddress || 'Your location'} → {activeRequest.destAddress || 'Destination'}
            </AppText>
            <View style={styles.activeFoot}>
              <AppText variant="caption" color="primary">
                View progress
              </AppText>
              <Ionicons name="navigate" size={16} color={t.colors.primary} />
            </View>
          </Card>
        ) : null}

        {activeJourney ? (
          <Card
            onPress={() => navigation.navigate('/journey/live')}
            accessibilityLabel="Open your active device-only journey"
            style={styles.activeCard}
          >
            <View style={styles.activeTop}>
              <View style={styles.activeHeading}>
                <AppText variant="label" color="textMuted">
                  YOUR JOURNEY · ON THIS DEVICE
                </AppText>
                <AppText variant="subheading" numberOfLines={1}>
                  {activeJourney.destination.name}
                </AppText>
              </View>
              <Badge label="Local only" tone="info" />
            </View>
            <AppText variant="caption" color="textMuted">
              {activeJourney.lastFix
                ? `Last updated ${formatDateTime(activeJourney.lastFix.recordedAt)}`
                : 'Waiting for location updates'}
            </AppText>
          </Card>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: t.colors.bgElevated, borderTopColor: t.colors.border }]}>
        {activeRequest ? (
          <PrimaryButton
            label="View active request"
            icon="navigate-outline"
            onPress={() => navigation.navigate({ pathname: '/booking/[id]', params: { id: activeRequest.id } })}
          />
        ) : (
          <EmergencyButton label="Request Emergency Ambulance" onPress={handleEmergencyPress} />
        )}

        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => setTransportSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Medical Transport or Checkup"
            style={[styles.secondaryAction, { borderColor: t.colors.border, borderRadius: t.radius.md }]}
          >
            <Ionicons name="medical-outline" size={19} color={t.colors.primary} />
            <AppText variant="label" color="text">
              Medical Transport / Checkup
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {})
              navigation.navigate('/journey/setup')
            }}
            accessibilityRole="button"
            accessibilityLabel="Track My Journey"
            style={[styles.secondaryAction, { borderColor: t.colors.border, borderRadius: t.radius.md }]}
          >
            <Ionicons name="navigate-outline" size={19} color={t.colors.primary} />
            <AppText variant="label" color="text">
              Track My Journey
            </AppText>
          </Pressable>
        </View>

        {activeRequest ? (
          <Pressable
            onPress={() => setDuplicateWarningOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Request another ambulance"
            style={styles.quietLink}
          >
            <AppText variant="caption" color="textMuted">
              Need another ambulance?
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <BottomSheet visible={transportSheetOpen} onClose={() => setTransportSheetOpen(false)} title="Choose transport" subtitle="No severity questions for routine checkups.">
        <View style={styles.sheetOptions}>
          <PrimaryButton
            label="Urgent Medical Transport"
            icon="time-outline"
            onPress={() => openRequest('urgent')}
          />
          <PrimaryButton
            label="Routine Checkup"
            icon="calendar-outline"
            onPress={() => openRequest('routine')}
          />
          <AppText variant="caption" color="textMuted">
            Dispatch applies its own safety and operational rules to every request.
          </AppText>
        </View>
      </BottomSheet>

      <ConfirmationSheet
        visible={duplicateWarningOpen}
        onClose={() => setDuplicateWarningOpen(false)}
        title="Request already in progress"
        message="You already have an active MediMove request. Opening another can create a duplicate."
        confirmLabel="View active request"
        cancelLabel="Go back"
        onConfirm={() => {
          setDuplicateWarningOpen(false)
          if (activeRequest) {
            navigation.navigate({ pathname: '/booking/[id]', params: { id: activeRequest.id } })
          }
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  greeting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  greetingText: { flex: 1, gap: 2 },
  refreshButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mapWrap: { position: 'relative' },
  mapEdit: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  mapLocate: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickupIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pickupText: { flex: 1, gap: 1 },
  activeCard: { gap: 8 },
  activeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  activeHeading: { flex: 1, gap: 3 },
  activeFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quietLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sheetOptions: { gap: 12 },
})
