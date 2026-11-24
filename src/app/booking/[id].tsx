import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RoleGate } from '@/components/RoleGate'
import { MapCanvas, type MapFocus, type MapMarker } from '@/components/MapCanvas'
import {
  AmbulanceStatusCard,
  AppText,
  Badge,
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
import { useRequesterLocationSharing } from '@/hooks/useRequesterLocationSharing'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { bookingService } from '@/services/booking.service'
import { useAppTheme } from '@/theme'
import type { BookingStatus, TrackingView } from '@/types'
import {
  canShareMovingPickup,
  emergencyCategoryLabel,
  formatDateTime,
  formatDistance,
  formatEta,
  formatNaira,
} from '@/utils/format'
import { bearingDeg } from '@/utils/geo'

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
const POLL_MS = 3000

function shortTime(iso: string | null | undefined): string {
  if (!iso) return 'time unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'time unknown'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function statusCopy(status: BookingStatus): { title: string; detail: string } {
  switch (status) {
    case 'REQUESTED':
      return {
        title: 'Request submitted',
        detail: 'Your request is with dispatch. This screen updates automatically when a crew accepts.',
      }
    case 'OFFERED':
      return {
        title: 'Finding an available ambulance',
        detail: 'Nearby ambulance providers are being offered your request.',
      }
    case 'ACCEPTED':
      return {
        title: 'Ambulance assigned',
        detail: 'An ambulance has accepted. Location updates will appear as the crew moves.',
      }
    case 'EN_ROUTE':
      return {
        title: 'Ambulance heading to pickup',
        detail: 'Stay at the pickup point and keep your phone nearby.',
      }
    case 'ARRIVED':
      return {
        title: 'Ambulance arrived',
        detail: 'Look for the crew at your pickup point.',
      }
    case 'PATIENT_ON_BOARD':
      return {
        title: 'Patient picked up',
        detail: 'Transport to the hospital is underway.',
      }
    case 'AT_HOSPITAL':
      return {
        title: 'At hospital',
        detail: 'The crew has arrived at the destination.',
      }
    case 'COMPLETED':
      return { title: 'Journey completed', detail: 'This request has been closed.' }
    case 'CANCELLED':
      return { title: 'Request cancelled', detail: 'The ambulance was released. No further updates are expected.' }
    case 'FAILED':
      return { title: 'Request failed', detail: 'The request could not be completed. Please try again if you still need help.' }
  }
}

function LiveTrackingContent() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const navigation = useSafeNavigation()
  const t = useAppTheme()
  const insets = useSafeAreaInsets()

  const bookingState = useAsync(() => bookingService.get(id), [id])
  const { refresh: refreshBooking, refreshing: bookingRefreshing } = bookingState
  const booking = bookingState.data?.booking ?? null
  const status = booking?.status ?? null

  const [tracking, setTracking] = useState<TrackingView | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [trackingRefreshing, setTrackingRefreshing] = useState(false)
  const trackingActiveRef = useRef(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [movingSharingConsent, setMovingSharingConsent] = useState(false)
  const [movingSharePromptOpen, setMovingSharePromptOpen] = useState(false)

  const canShareMoving = status ? canShareMovingPickup(status) : false
  const movingSharing = useRequesterLocationSharing(
    canShareMoving && id ? id : null,
    canShareMoving && movingSharingConsent,
  )

  useEffect(() => {
    trackingActiveRef.current = true
    return () => {
      trackingActiveRef.current = false
    }
  }, [])

  const pollTracking = useCallback(
    async (manual = false) => {
      if (!id) return
      if (manual) setTrackingRefreshing(true)
      try {
        const res = await bookingService.tracking(id)
        if (!trackingActiveRef.current) return
        setTracking(res.tracking)
        setTrackingError(null)
      } catch (err) {
        if (trackingActiveRef.current) {
          setTrackingError((err as Error).message || 'Tracking is temporarily unavailable.')
        }
      } finally {
        if (manual && trackingActiveRef.current) setTrackingRefreshing(false)
      }
    },
    [id]
  )

  // Poll the public tracking view while a trip is in progress.
  useEffect(() => {
    if (!id || (status && TERMINAL.includes(status))) return
    // Defer the first poll so an effect body never sets state synchronously.
    void Promise.resolve().then(() => void pollTracking())
    const interval = setInterval(() => void pollTracking(), POLL_MS)
    return () => clearInterval(interval)
  }, [id, status, pollTracking])

  const refreshAll = useCallback(
    (withFeedback = false) => {
      if (withFeedback) Haptics.selectionAsync().catch(() => {})
      refreshBooking()
      void pollTracking(true)
    },
    [refreshBooking, pollTracking]
  )

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
    if (tracking?.requesterLocation?.latitude != null && tracking.requesterLocation.longitude != null) {
      list.push({
        id: 'requester',
        latitude: tracking.requesterLocation.latitude,
        longitude: tracking.requesterLocation.longitude,
        kind: 'requester',
        label: 'Your moving location',
      })
    }
    if (tracking?.nextWaypoint) {
      list.push({
        id: 'next-waypoint',
        latitude: tracking.nextWaypoint.lat,
        longitude: tracking.nextWaypoint.lng,
        kind: tracking.nextWaypoint.kind === 'PICKUP' ? 'user' : 'hospital',
        label: tracking.nextWaypoint.address ?? tracking.nextWaypoint.kind,
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

  const location = tracking?.location ?? null
  const locationIsLive = Boolean(tracking?.isLive && location?.isLive)

  // Only a server-live crew fix drives the follow camera. The fallback heading
  // is derived from the last two backend fixes, not from estimated movement.
  const liveFocus = useMemo<MapFocus | null>(() => {
    if (!locationIsLive || location?.latitude == null || location.longitude == null) return null
    const fixes = (tracking?.recentLocations ?? [])
      .filter((fix) => fix.subject !== 'REQUESTER' && fix.latitude != null && fix.longitude != null)
      .slice()
      .sort((a, b) => new Date(a.recordedAt ?? 0).getTime() - new Date(b.recordedAt ?? 0).getTime())
    const previous = fixes.length >= 2 ? fixes[fixes.length - 2] : null
    const heading =
      location.headingDeg ?? (previous ? bearingDeg(previous, location) : null)
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      headingDeg: heading,
      live: true,
    }
  }, [locationIsLive, location, tracking?.recentLocations])

  const mapCaption = location
    ? locationIsLive
      ? `LIVE · FOLLOWING AMBULANCE · UPDATED ${shortTime(location.recordedAt)} · ${tracking?.lastKnownSource ?? location.source ?? 'GPS'}`
      : `LAST KNOWN POSITION · ${shortTime(location.recordedAt)} · NOT LIVE`
    : 'WAITING FOR LOCATION'
  const etaValue =
    tracking?.isLive && tracking.etaMinutes != null
      ? formatEta(tracking.etaMinutes)
      : tracking?.isLive && tracking.etaAt
        ? `Around ${shortTime(tracking.etaAt)}`
        : 'Not available'

  const requesterFix = tracking?.requesterLocation ?? null
  const requesterFixIsLive = Boolean(tracking?.isRequesterLocationLive && requesterFix?.isLive)
  const lastSharedAt = requesterFix?.recordedAt ?? movingSharing.lastSharedAt

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
          onAction={() => navigation.back()}
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
        <MapCanvas
          markers={markers}
          route={route}
          height={320}
          caption={mapCaption}
          focus={liveFocus}
          accessibilityLabel={
            liveFocus
              ? 'Live map following the ambulance with 3D buildings, your moving location when shared, pickup and destination'
              : 'Map showing the ambulance last reported position, your moving location when shared, pickup and destination'
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
          <View style={styles.mapHeaderActions}>
            <Pressable
              onPress={() => refreshAll(true)}
              accessibilityRole="button"
              accessibilityLabel="Refresh booking and tracking"
              style={styles.mapRefresh}
            >
              <Ionicons
                name={trackingRefreshing || bookingRefreshing ? 'refresh-outline' : 'refresh'}
                size={18}
                color={t.colors.primary}
              />
            </Pressable>
            <StatusBadge status={status} tone={statusTone} />
          </View>
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
            <RefreshControl
              refreshing={bookingRefreshing || trackingRefreshing}
              onRefresh={() => refreshAll()}
              tintColor={t.colors.primary}
            />
          }
        >
          <AppText variant="body" color="textMuted">
            {meta.detail}
          </AppText>

          {trackingError ? <Notice text={trackingError} tone="warning" /> : null}

          {location && !locationIsLive ? (
            <Notice
              text={`Live updates are unavailable. Showing the last known position recorded ${formatDateTime(location.recordedAt)}.`}
              tone="warning"
            />
          ) : null}

          {!location && tracking ? (
            <Notice
              text="The crew's location has not been shared yet. Status updates will still appear here."
              tone="info"
            />
          ) : null}

          {canShareMoving ? (
            <Card style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <AppText variant="heading">Moving pickup</AppText>
                <Badge
                  label={movingSharing.active ? 'Sharing on' : 'Not sharing'}
                  tone={movingSharing.active ? 'success' : 'neutral'}
                />
              </View>
              <AppText variant="caption" color="textMuted">
                If you are in another vehicle, share your location so the crew can meet you on the way.
                Updates are sent only while this screen is open. If you are in immediate danger, call
                local emergency services too.
              </AppText>

              {movingSharing.starting ? (
                <AppText variant="caption" color="textMuted">
                  Starting location sharing…
                </AppText>
              ) : null}
              {movingSharing.error ? <Notice text={movingSharing.error} tone="warning" /> : null}
              {requesterFix ? (
                <DetailRow
                  icon="locate-outline"
                  label="Last shared"
                  value={`${formatDateTime(lastSharedAt)}${requesterFixIsLive ? '' : ' (last known)'}`}
                />
              ) : movingSharing.active ? (
                <AppText variant="caption" color="textMuted">
                  Waiting for your first location update.
                </AppText>
              ) : null}
              {movingSharing.active && requesterFix && !requesterFixIsLive ? (
                <Notice text="Your last shared position is no longer live. Keep this screen open or stop sharing." tone="warning" />
              ) : null}

              {movingSharingConsent ? (
                <SecondaryButton
                  label="Stop sharing my location"
                  icon="locate-outline"
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {})
                    setMovingSharingConsent(false)
                  }}
                />
              ) : (
                <PrimaryButton
                  label="Share my moving location"
                  icon="navigate-outline"
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {})
                    setMovingSharePromptOpen(true)
                  }}
                />
              )}
            </Card>
          ) : null}

          <View style={styles.statsRow}>
            <StatTile icon="time-outline" label="ETA" value={etaValue} />
            <StatTile
              icon="analytics-outline"
              label="Remaining"
              value={
                tracking?.isLive && tracking.distanceRemainingKm != null
                  ? formatDistance(tracking.distanceRemainingKm)
                  : '—'
              }
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
            {location?.recordedAt ? (
              <DetailRow
                icon="locate-outline"
                label="Location at"
                value={`${formatDateTime(location.recordedAt)}${locationIsLive ? '' : ' (last known)'}`}
              />
            ) : null}
            {tracking?.nextWaypoint?.address ? (
              <DetailRow icon="navigate-outline" label="Heading to" value={tracking.nextWaypoint.address} />
            ) : null}
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
                onPress={() => navigation.navigate({ pathname: '/booking/checkout', params: { bookingId: booking.id } })}
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

      <ConfirmationSheet
        visible={movingSharePromptOpen}
        onClose={() => setMovingSharePromptOpen(false)}
        title="Share your moving location?"
        subtitle="For this ambulance request"
        message="The assigned crew will see where you are so they can meet you on the way. Sharing runs only while this screen is open, and you can stop at any time."
        confirmLabel="Start sharing"
        cancelLabel="Not now"
        onConfirm={() => {
          setMovingSharePromptOpen(false)
          setMovingSharingConsent(true)
        }}
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
  mapHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapRefresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheet: { flex: 1, marginTop: -18, borderTopWidth: 1, borderTopColor: 'transparent' },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 12, paddingHorizontal: 4, borderWidth: 1 },
  card: { gap: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
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

export default function LiveTrackingScreen() {
  return (
    <RoleGate allow={['PATIENT']}>
      <LiveTrackingContent />
    </RoleGate>
  )
}
