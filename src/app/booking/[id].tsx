import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TrackingMap, type MapMarker } from '@/components/TrackingMap'
import {
  AmbulanceStatusCard,
  AppText,
  Card,
  ConfirmationSheet,
  ErrorState,
  LoadingState,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusBadge,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { bookingService } from '@/services/booking.service'
import { useAppTheme } from '@/theme'
import type { BookingStatus, TrackingView } from '@/types'
import {
  emergencyCategoryLabel,
  formatDateTime,
  formatDistance,
  formatEta,
  formatNaira,
} from '@/utils/format'

const TIMELINE: BookingStatus[] = [
  'REQUESTED',
  'OFFERED',
  'ACCEPTED',
  'EN_ROUTE',
  'ARRIVED',
  'PATIENT_ON_BOARD',
  'AT_HOSPITAL',
  'COMPLETED',
]
const TERMINAL: BookingStatus[] = ['COMPLETED', 'CANCELLED', 'FAILED']
const POLL_MS = 5000

function statusCopy(status: BookingStatus): { title: string; detail: string } {
  switch (status) {
    case 'REQUESTED':
      return {
        title: 'Request sent',
        detail: 'Your request is with dispatch. This screen updates automatically when a crew accepts.',
      }
    case 'OFFERED':
      return {
        title: 'Offering to crews',
        detail: 'Nearby ambulance providers are being offered your request.',
      }
    case 'ACCEPTED':
      return {
        title: 'Crew assigned',
        detail: 'An ambulance has accepted. Location updates will appear as the crew moves.',
      }
    case 'EN_ROUTE':
      return {
        title: 'Ambulance on the way',
        detail: 'Stay at the pickup point and keep your phone nearby.',
      }
    case 'ARRIVED':
      return {
        title: 'Ambulance arrived',
        detail: 'Look for the crew at your pickup point.',
      }
    case 'PATIENT_ON_BOARD':
      return {
        title: 'Patient on board',
        detail: 'Transport to the hospital is underway.',
      }
    case 'AT_HOSPITAL':
      return {
        title: 'At the hospital',
        detail: 'The crew has arrived at the destination.',
      }
    case 'COMPLETED':
      return { title: 'Trip completed', detail: 'This request has been closed.' }
    case 'CANCELLED':
      return { title: 'Request cancelled', detail: 'The ambulance was released. No further updates are expected.' }
    case 'FAILED':
      return { title: 'Request failed', detail: 'The request could not be completed. Please try again if you still need help.' }
  }
}

export default function LiveTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const t = useAppTheme()
  const insets = useSafeAreaInsets()

  const bookingState = useAsync(() => bookingService.get(id), [id])
  const booking = bookingState.data?.booking ?? null
  const status = booking?.status ?? null

  const [tracking, setTracking] = useState<TrackingView | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  // Poll the public tracking view while a trip is in progress.
  useEffect(() => {
    if (!id || (status && TERMINAL.includes(status))) return
    let active = true

    const poll = async () => {
      try {
        const res = await bookingService.tracking(id)
        if (!active) return
        setTracking(res.tracking)
        setTrackingError(null)
      } catch (err) {
        if (active) setTrackingError((err as Error).message || 'Tracking is temporarily unavailable.')
      }
    }

    void poll()
    const interval = setInterval(() => void poll(), POLL_MS)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [id, status])

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = []
    if (booking) {
      list.push({
        id: 'pickup',
        latitude: booking.pickupLat,
        longitude: booking.pickupLng,
        kind: 'user',
        label: 'Pickup',
      })
      if (booking.destLat != null && booking.destLng != null) {
        list.push({
          id: 'dest',
          latitude: booking.destLat,
          longitude: booking.destLng,
          kind: 'hospital',
          label: 'Destination',
        })
      }
    }
    if (tracking?.location?.latitude != null && tracking.location.longitude != null) {
      list.push({
        id: 'ambulance',
        latitude: tracking.location.latitude,
        longitude: tracking.location.longitude,
        kind: 'ambulance',
        label: 'Ambulance',
      })
    }
    return list
  }, [booking, tracking])

  const route = useMemo(
    () =>
      (tracking?.recentLocations ?? [])
        .filter((loc) => loc.latitude != null && loc.longitude != null)
        .slice()
        .sort((a, b) => new Date(a.recordedAt ?? 0).getTime() - new Date(b.recordedAt ?? 0).getTime())
        .map((loc) => ({ latitude: loc.latitude as number, longitude: loc.longitude as number })),
    [tracking]
  )

  const currentStep = status ? TIMELINE.indexOf(status) : -1
  const meta = status ? statusCopy(status) : null

  const confirmCancel = async () => {
    if (!id) return
    setCancelling(true)
    try {
      await bookingService.cancel(id, 'Cancelled by requester')
      setCancelOpen(false)
      bookingState.reload()
    } catch (err) {
      setTrackingError((err as Error).message || 'Could not cancel this request.')
      setCancelOpen(false)
    } finally {
      setCancelling(false)
    }
  }

  if (bookingState.loading && !booking) {
    return (
      <Screen padded={false} safeTop={false}>
        <LoadingState message="Loading your trip…" />
      </Screen>
    )
  }

  if (bookingState.error || !booking || !status || !meta) {
    return (
      <Screen>
        <ErrorState
          title="Booking unavailable"
          message={bookingState.error ?? 'This request could not be found.'}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    )
  }

  const statusTone = status === 'FAILED' || status === 'CANCELLED' ? 'danger' : undefined
  const canCancel = ['REQUESTED', 'OFFERED', 'ACCEPTED', 'EN_ROUTE'].includes(status)
  const canPay = !booking.paidAt && status !== 'CANCELLED' && status !== 'FAILED'

  return (
    <Screen padded={false} safeTop={false}>
      <View style={styles.mapArea}>
        <TrackingMap
          markers={markers}
          route={route}
          height={320}
          caption={
            tracking?.isLive
              ? `LIVE · ${tracking.lastKnownSource ?? 'GPS'}`
              : tracking
                ? 'LAST KNOWN POSITION'
                : 'WAITING FOR LOCATION'
          }
        />
        <View style={[styles.mapHeader, { backgroundColor: t.colors.bgElevated, borderRadius: t.radius.lg }]}>
          <View style={styles.mapHeaderText}>
            <AppText variant="micro" color="textMuted">
              {booking.reference}
            </AppText>
            <AppText variant="heading" numberOfLines={1}>
              {meta.title}
            </AppText>
          </View>
          <StatusBadge status={status} tone={statusTone} />
        </View>
      </View>

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: t.colors.bgElevated,
            borderTopLeftRadius: t.radius.xxl,
            borderTopRightRadius: t.radius.xxl,
            paddingBottom: insets.bottom + t.spacing.sm,
          },
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: t.colors.borderStrong }]} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={bookingState.refreshing} onRefresh={bookingState.refresh} tintColor={t.colors.primary} />
          }
        >
          <AppText variant="body" color="textMuted">
            {meta.detail}
          </AppText>

          {trackingError ? <Notice text={trackingError} tone="warning" /> : null}

          <View style={styles.statsRow}>
            <StatTile
              icon="time-outline"
              label="ETA"
              value={tracking?.etaMinutes != null ? formatEta(tracking.etaMinutes) : 'Not available'}
            />
            <StatTile
              icon="analytics-outline"
              label="Remaining"
              value={tracking?.distanceRemainingKm != null ? formatDistance(tracking.distanceRemainingKm) : '—'}
            />
            <StatTile icon="wallet-outline" label="Fare" value={formatNaira(booking.estimatedFare)} />
          </View>

          <Card style={styles.card}>
            <AppText variant="heading">Trip details</AppText>
            <DetailRow icon="location-outline" label="Pickup" value={booking.pickupAddress || 'Your location'} />
            <DetailRow icon="business-outline" label="Destination" value={booking.destAddress || 'Destination'} />
            <DetailRow
              icon="medkit-outline"
              label="Emergency"
              value={emergencyCategoryLabel(booking.emergencyCategory ?? 'OTHER')}
            />
            <DetailRow icon="calendar-outline" label="Requested" value={formatDateTime(booking.createdAt)} />
          </Card>

          <Card style={styles.card}>
            <AppText variant="heading">Assigned crew</AppText>
            {booking.provider ? (
              <AmbulanceStatusCard
                name={booking.provider.name}
                vehicleType={booking.provider.vehicleType}
                detail="Assigned to this trip"
                tone="primary"
                right={
                  booking.provider.phone ? (
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {})
                        void Linking.openURL(`tel:${booking.provider!.phone}`)
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${booking.provider.name}`}
                      style={[styles.callButton, { backgroundColor: t.colors.primary, borderRadius: t.radius.pill }]}
                    >
                      <Ionicons name="call" size={17} color={t.colors.onPrimary} />
                    </Pressable>
                  ) : null
                }
              />
            ) : (
              <Notice text="A crew is being assigned. We'll update this automatically." tone="info" />
            )}
          </Card>

          <Card style={styles.card}>
            <AppText variant="heading">Progress</AppText>
            {status === 'CANCELLED' || status === 'FAILED' ? (
              <Notice text={`This request was ${status.toLowerCase()}.`} tone="danger" />
            ) : (
              <View style={styles.timeline}>
                {TIMELINE.map((step, index) => {
                  const done = index <= currentStep
                  const active = index === currentStep
                  return (
                    <View key={step} style={styles.timelineRow}>
                      <View style={styles.timelineTrack}>
                        <View
                          style={[
                            styles.timelineDot,
                            {
                              backgroundColor: done ? t.colors.primary : t.colors.surfaceAlt,
                              borderColor: done ? t.colors.primary : t.colors.borderStrong,
                            },
                          ]}
                        >
                          {done ? <Ionicons name="checkmark" size={11} color={t.colors.onPrimary} /> : null}
                        </View>
                        {index < TIMELINE.length - 1 ? (
                          <View
                            style={[
                              styles.timelineLine,
                              { backgroundColor: index < currentStep ? t.colors.primary : t.colors.border },
                            ]}
                          />
                        ) : null}
                      </View>
                      <AppText
                        variant={active ? 'bodyStrong' : 'body'}
                        color={done ? 'text' : 'textFaint'}
                        style={styles.timelineLabel}
                      >
                        {statusCopy(step).title}
                      </AppText>
                    </View>
                  )
                })}
              </View>
            )}
          </Card>

          <View style={styles.actions}>
            {booking.paidAt ? (
              <Notice text="Payment received" tone="success" />
            ) : canPay ? (
              <PrimaryButton
                label="Pay for this trip"
                icon="card-outline"
                onPress={() => router.push({ pathname: '/booking/checkout', params: { bookingId: booking.id } })}
              />
            ) : null}

            {canCancel ? (
              <SecondaryButton
                label="Cancel request"
                icon="close-circle-outline"
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
                  setCancelOpen(true)
                }}
              />
            ) : null}
          </View>
        </ScrollView>
      </View>

      <ConfirmationSheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this request?"
        subtitle={booking.reference}
        message="The assigned ambulance will be released. This cannot be undone."
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        destructive
        loading={cancelling}
        onConfirm={() => void confirmCancel()}
      />
    </Screen>
  )
}

function StatTile({ icon, label, value }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  const t = useAppTheme()
  return (
    <View style={[styles.stat, { backgroundColor: t.colors.surface, borderColor: t.colors.border, borderRadius: t.radius.md }]}>
      <Ionicons name={icon} size={18} color={t.colors.secondary} />
      <AppText variant="bodyStrong" numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="micro" color="textFaint">
        {label.toUpperCase()}
      </AppText>
    </View>
  )
}

function DetailRow({ icon, label, value }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  const t = useAppTheme()
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={t.colors.textFaint} />
      <AppText variant="caption" color="textMuted" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="body" numberOfLines={2} style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mapArea: { height: 320, paddingHorizontal: 20, paddingTop: 8 },
  mapHeader: {
    position: 'absolute',
    top: 18,
    left: 32,
    right: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapHeaderText: { flex: 1, gap: 2 },
  sheet: { flex: 1, marginTop: -18, borderTopWidth: 1, borderTopColor: 'transparent' },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 12, paddingHorizontal: 4, borderWidth: 1 },
  card: { gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { width: 82 },
  detailValue: { flex: 1, textAlign: 'right' },
  callButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', minHeight: 42 },
  timelineTrack: { width: 22, alignItems: 'center' },
  timelineDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1 },
  timelineLabel: { flex: 1, paddingTop: 1 },
  actions: { gap: 10, marginTop: 8 },
})
