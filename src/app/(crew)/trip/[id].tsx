import * as Haptics from 'expo-haptics'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, RefreshControl, StyleSheet, View } from 'react-native'
import {
  AppInput,
  AppText,
  Badge,
  Button,
  Card,
  ConfirmationSheet,
  ErrorState,
  LoadingState,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useCrewLocationSharing } from '@/hooks/useCrewLocationSharing'
import { crewService } from '@/services/crew.service'
import { useAppTheme } from '@/theme'
import type { Booking, BookingStatus, CrewTripStatus, Payment, TrackingView } from '@/types'
import {
  bookingStatusMeta,
  emergencyCategoryLabel,
  formatDistance,
  formatNaira,
  titleCase,
} from '@/utils/format'

const MILESTONES: CrewTripStatus[] = [
  'EN_ROUTE',
  'ARRIVED',
  'PATIENT_ON_BOARD',
  'AT_HOSPITAL',
  'COMPLETED',
]
const ACTIVE_STATUSES: BookingStatus[] = [
  'ACCEPTED',
  'EN_ROUTE',
  'ARRIVED',
  'PATIENT_ON_BOARD',
  'AT_HOSPITAL',
]
const TERMINAL_STATUSES: BookingStatus[] = ['COMPLETED', 'CANCELLED', 'FAILED']
const POLL_MS = 3000

function nextMilestone(status: BookingStatus | null | undefined): CrewTripStatus | null {
  if (!status) return null
  if (status === 'ACCEPTED') return 'EN_ROUTE'
  const index = MILESTONES.indexOf(status as CrewTripStatus)
  return index >= 0 && index < MILESTONES.length - 1 ? MILESTONES[index + 1] : null
}

function shortTime(iso: string | null | undefined): string {
  if (!iso) return 'time unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'time unknown'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const t = useAppTheme()
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="label" style={{ color: t.colors.text }} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  )
}

export default function CrewTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const tripState = useAsync(() => crewService.trip(id), [id])
  const trip: Booking | null = tripState.data?.trip ?? null
  const status = trip?.status ?? null
  const next = nextMilestone(status)
  const canTrack = status != null && ACTIVE_STATUSES.includes(status)

  const [tracking, setTracking] = useState<TrackingView | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [trackingRefreshing, setTrackingRefreshing] = useState(false)
  const trackingActiveRef = useRef(true)

  const [milestoneBusy, setMilestoneBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sharingConsent, setSharingConsent] = useState(false)
  const [sharePromptOpen, setSharePromptOpen] = useState(false)
  const [noShowReason, setNoShowReason] = useState('')
  const [noShowBusy, setNoShowBusy] = useState(false)
  const [noShowOpen, setNoShowOpen] = useState(false)
  const [cashBusy, setCashBusy] = useState(false)
  const [cashOpen, setCashOpen] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null)

  const sharing = useCrewLocationSharing(canTrack ? id : null, canTrack && sharingConsent)

  // Foreground-only: leaving the app stops sharing. The user must explicitly
  // start again on return; nothing is silently resumed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && sharingConsent) setSharingConsent(false)
    })
    return () => subscription.remove()
  }, [sharingConsent])

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
        const result = await crewService.tracking(id)
        if (!trackingActiveRef.current) return
        setTracking(result.tracking)
        setTrackingError(null)
      } catch (err) {
        if (trackingActiveRef.current) {
          setTrackingError((err as Error).message || 'Tracking is temporarily unavailable.')
        }
      } finally {
        if (manual && trackingActiveRef.current) setTrackingRefreshing(false)
      }
    },
    [id],
  )

  useEffect(() => {
    if (!id || (status != null && TERMINAL_STATUSES.includes(status))) return
    void Promise.resolve().then(() => void pollTracking())
    const interval = setInterval(() => void pollTracking(), POLL_MS)
    return () => clearInterval(interval)
  }, [id, status, pollTracking])

  const refreshAll = useCallback(() => {
    tripState.refresh()
    void pollTracking(true)
  }, [tripState, pollTracking])

  const advance = async () => {
    if (!next || !trip || milestoneBusy) return
    setMilestoneBusy(true)
    setActionError(null)
    try {
      const result = await crewService.updateTripStatus(trip.id, next)
      tripState.setData(result)
      await pollTracking(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } catch (err) {
      setActionError((err as Error).message || 'The status could not be updated.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setMilestoneBusy(false)
    }
  }

  const reportNoShow = async () => {
    if (!trip || noShowBusy || noShowReason.trim().length < 3) return
    setNoShowBusy(true)
    setActionError(null)
    try {
      const result = await crewService.reportNoShow(trip.id, noShowReason.trim())
      tripState.setData(result)
      setNoShowOpen(false)
      setSharingConsent(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } catch (err) {
      setActionError((err as Error).message || 'The no-show could not be reported.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setNoShowBusy(false)
    }
  }

  const collectCash = async () => {
    if (!trip || cashBusy) return
    setCashBusy(true)
    setActionError(null)
    try {
      // Omit amountKobo so the server uses the confirmed fare — the client never
      // supplies a price of its own.
      const result = await crewService.collectCash({ bookingId: trip.id })
      setPayment(result.payment)
      setCashOpen(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } catch (err) {
      setActionError((err as Error).message || 'Cash collection could not be recorded.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setCashBusy(false)
    }
  }

  const openNavigation = async () => {
    const point = tracking?.nextWaypoint
    const lat = point?.lat ?? (status === 'ARRIVED' || status === 'PATIENT_ON_BOARD' || status === 'AT_HOSPITAL'
      ? trip?.destLat
      : trip?.pickupLat)
    const lng = point?.lng ?? (status === 'ARRIVED' || status === 'PATIENT_ON_BOARD' || status === 'AT_HOSPITAL'
      ? trip?.destLng
      : trip?.pickupLng)
    if (lat == null || lng == null) return
    try {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
    } catch {
      setActionError('Could not open navigation. Check that a maps app is available.')
    }
  }

  const stepIndex = status === 'ACCEPTED' ? 0 : Math.max(0, MILESTONES.indexOf(status as CrewTripStatus))
  const meta = status ? bookingStatusMeta(status) : null
  const waypoint = tracking?.nextWaypoint
  const fix = tracking?.location
  const showCash = trip != null && !trip.paidAt && !['REQUESTED', 'OFFERED', 'CANCELLED', 'FAILED'].includes(trip.status)
  const showNoShow = status === 'ARRIVED'

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={tripState.refreshing || trackingRefreshing} onRefresh={refreshAll} />
      }
      contentStyle={styles.content}
    >
      {tripState.loading ? <LoadingState message="Loading assigned trip…" /> : null}
      {tripState.error ? (
        <ErrorState message={tripState.error} actionLabel="Try again" onAction={tripState.reload} />
      ) : null}
      {actionError ? <Notice tone="danger" text={actionError} /> : null}

      {trip ? (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <Badge label="Assigned trip" tone="primary" icon="navigate-outline" />
              {meta ? <Badge label={meta.label} tone={meta.tone} /> : null}
            </View>
            <AppText variant="display" style={styles.title}>
              {trip.reference}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {trip.emergencyCategory
                ? emergencyCategoryLabel(trip.emergencyCategory)
                : 'Category not provided'}
            </AppText>
          </Card>

          <Card>
            <AppText variant="heading">Milestones</AppText>
            <View style={styles.timeline}>
              {MILESTONES.map((milestone, index) => (
                <View key={milestone} style={styles.timelineRow}>
                  <Badge
                    label={index < stepIndex ? 'Done' : index === stepIndex ? 'Current' : 'Next'}
                    tone={index < stepIndex ? 'success' : index === stepIndex ? 'primary' : 'neutral'}
                    icon={index < stepIndex ? 'checkmark-circle-outline' : 'ellipse-outline'}
                  />
                  <AppText variant="label">{titleCase(milestone)}</AppText>
                </View>
              ))}
            </View>
            {next ? (
              <PrimaryButton
                label={`Mark ${titleCase(next).toLowerCase()}`}
                onPress={() => void advance()}
                loading={milestoneBusy}
                disabled={milestoneBusy}
                icon="arrow-forward-circle-outline"
              />
            ) : (
              <Notice
                tone="info"
                text={
                  status === 'COMPLETED'
                    ? 'This trip is complete.'
                    : 'No further crew milestones are available for this trip.'
                }
              />
            )}
          </Card>

          <Card>
            <AppText variant="heading">Where to go</AppText>
            {waypoint ? (
              <AppText variant="body" style={styles.spaced}>
                {waypoint.address || `${waypoint.kind === 'PICKUP' ? 'Pickup' : 'Destination'} coordinates`}
              </AppText>
            ) : (
              <AppText variant="body" style={styles.spaced}>
                {status === 'ARRIVED' || status === 'PATIENT_ON_BOARD' || status === 'AT_HOSPITAL'
                  ? trip.destAddress || 'Destination address not provided'
                  : trip.pickupAddress}
              </AppText>
            )}
            <AppText variant="micro" color="textFaint" style={styles.spaced}>
              {trip.pickupLat}, {trip.pickupLng}
              {trip.destLat != null && trip.destLng != null
                ? ` → ${trip.destLat}, ${trip.destLng}`
                : ''}
            </AppText>
            <AppText variant="caption" color="textMuted" style={styles.spaced}>
              Directions open in Google Maps. No route or travel time is estimated here.
            </AppText>
            <SecondaryButton
              label="Open navigation"
              icon="navigate-outline"
              onPress={() => void openNavigation()}
            />
          </Card>

          <Card>
            <View style={styles.rowBetween}>
              <AppText variant="heading">Crew location sharing</AppText>
              {fix ? (
                <Badge
                  label={fix.isLive ? 'Live' : 'Last known'}
                  tone={fix.isLive ? 'success' : 'warning'}
                  icon={fix.isLive ? 'locate-outline' : 'time-outline'}
                />
              ) : null}
            </View>
            <AppText variant="caption" color="textMuted">
              Sharing runs only while you keep this screen open and the watch is on. Stop it any time.
            </AppText>
            {!canTrack ? (
              <Notice tone="info" text="Location sharing is only available during an active trip." />
            ) : null}
            {sharing.error ? <Notice tone="danger" text={sharing.error} /> : null}
            <View style={styles.rowButtons}>
              <Button
                label={sharingConsent ? 'Stop sharing' : 'Start sharing'}
                variant={sharingConsent ? 'secondary' : 'primary'}
                size="lg"
                disabled={!canTrack || sharing.starting}
                loading={sharing.starting}
                onPress={() => {
                  if (sharingConsent) setSharingConsent(false)
                  else setSharePromptOpen(true)
                }}
              />
            </View>
            {sharing.lastSharedAt ? (
              <AppText variant="micro" color="textFaint" style={styles.spaced}>
                Last fix accepted by server at {shortTime(sharing.lastSharedAt)}
              </AppText>
            ) : (
              <AppText variant="micro" color="textFaint" style={styles.spaced}>
                {fix ? `Last fix recorded ${shortTime(fix.recordedAt)} (${fix.source})` : 'Location not shared'}
              </AppText>
            )}
            {trackingError ? <Notice tone="warning" text={trackingError} /> : null}
            {tracking?.etaMinutes != null ? (
              <AppText variant="caption" color="textMuted" style={styles.spaced}>
                Backend ETA: {Math.max(1, Math.round(tracking.etaMinutes))} min
              </AppText>
            ) : null}
            {tracking?.isRequesterLocationLive && tracking.requesterLocation ? (
              <AppText variant="caption" color="textMuted" style={styles.spaced}>
                Requester is sharing a moving pickup location (updated {shortTime(tracking.requesterLocation.recordedAt)}).
              </AppText>
            ) : (
              <AppText variant="caption" color="textFaint" style={styles.spaced}>
                Requester moving location: not shared
              </AppText>
            )}
          </Card>

          <Card>
            <AppText variant="heading">Trip details</AppText>
            <DetailRow label="Distance" value={formatDistance(trip.distanceKm)} />
            <DetailRow label="Confirmed fare" value={formatNaira(trip.estimatedFare)} />
            <DetailRow label="Pickup" value={trip.pickupAddress} />
            <DetailRow label="Destination" value={trip.destAddress || 'Not provided'} />
            {trip.callbackPhone ? <DetailRow label="Callback" value={trip.callbackPhone} /> : null}
          </Card>

          {payment ? (
            <Card>
              <AppText variant="heading">Cash recorded</AppText>
              <DetailRow label="Receipt" value={payment.receiptNumber || 'Issued'} />
              <DetailRow label="Amount" value={formatNaira(payment.amountKobo)} />
            </Card>
          ) : showCash ? (
            <Card>
              <AppText variant="heading">Payment on scene</AppText>
              <AppText variant="caption" color="textMuted">
                Record cash only after you have actually collected it. The server uses the confirmed fare.
              </AppText>
              <SecondaryButton
                label="Record cash collection"
                icon="cash-outline"
                loading={cashBusy}
                disabled={cashBusy}
                onPress={() => setCashOpen(true)}
              />
            </Card>
          ) : null}

          {showNoShow ? (
            <Card>
              <AppText variant="heading">Patient not at pickup</AppText>
              <AppInput
                label="Reason (required)"
                value={noShowReason}
                onChangeText={setNoShowReason}
                placeholder="Describe what happened"
                maxLength={500}
              />
              <Button
                label="Report no-show"
                variant="danger"
                size="lg"
                loading={noShowBusy}
                disabled={noShowBusy || noShowReason.trim().length < 3}
                onPress={() => setNoShowOpen(true)}
              />
            </Card>
          ) : null}

          {status && TERMINAL_STATUSES.includes(status) ? (
            <Notice
              tone="info"
              text="This trip is closed. Location sharing has stopped and no further milestones are available."
            />
          ) : null}
        </>
      ) : null}

      <ConfirmationSheet
        visible={sharePromptOpen}
        onClose={() => setSharePromptOpen(false)}
        title="Share your live location?"
        subtitle="Only while this screen is open"
        message="Dispatch and the requester will see your position while this trip is active. Sharing stops when you press Stop, leave this screen or send the app to the background."
        confirmLabel="Start sharing"
        cancelLabel="Not now"
        onConfirm={() => {
          setSharePromptOpen(false)
          setSharingConsent(true)
        }}
      />

      <ConfirmationSheet
        visible={cashOpen}
        onClose={() => setCashOpen(false)}
        title="Record cash payment?"
        subtitle={trip?.reference}
        message={`Confirm that you have collected ${formatNaira(trip?.estimatedFare ?? 0)} in cash. This cannot be undone.`}
        confirmLabel="Record cash"
        cancelLabel="Not yet"
        loading={cashBusy}
        onConfirm={() => void collectCash()}
      />

      <ConfirmationSheet
        visible={noShowOpen}
        onClose={() => setNoShowOpen(false)}
        title="Report a no-show?"
        subtitle={trip?.reference}
        message={`${noShowReason.trim()}. This ends the trip as failed and cannot be undone.`}
        confirmLabel="Report no-show"
        cancelLabel="Keep waiting"
        destructive
        loading={noShowBusy}
        onConfirm={() => void reportNoShow()}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowButtons: { marginTop: 14 },
  title: { marginTop: 12 },
  spaced: { marginTop: 8 },
  timeline: { gap: 10, marginTop: 12, marginBottom: 16 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
})
