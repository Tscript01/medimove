import * as Haptics from 'expo-haptics'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  AppInput,
  AppText,
  Badge,
  Card,
  ErrorState,
  LoadingState,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { crewService } from '@/services/crew.service'
import { useAppTheme } from '@/theme'
import type { Booking, DispatchOffer } from '@/types'
import {
  emergencyCategoryLabel,
  formatDateTime,
  formatDistance,
  formatNaira,
  titleCase,
} from '@/utils/format'

export default function CrewOfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const navigation = useSafeNavigation()
  const [reason, setReason] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const state = useAsync(async () => {
    const [bookingResult, offersResult] = await Promise.all([
      crewService.booking(id),
      crewService.offers(),
    ])
    const offer = offersResult.offers.find((item) => item.id === id) ?? null
    return { booking: bookingResult.booking, offer }
  }, [id])

  const booking: Booking | null = state.data?.booking ?? null
  const offer: DispatchOffer | null = state.data?.offer ?? null
  // The server owns expiry. A stale offer that was live on load must be
  // re-read before acting; the accept call re-checks it too.
  const actionable = offer?.status === 'PENDING' && offer.isLive === true

  const accept = async () => {
    if (!actionable || !booking || accepting || rejecting) return
    setAccepting(true)
    setActionError(null)
    try {
      const result = await crewService.acceptOffer(id)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      navigation.replace({ pathname: '/(crew)/trip/[id]', params: { id: result.booking.id } })
    } catch (err) {
      setActionError((err as Error).message || 'The offer could not be accepted.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      state.refresh()
    } finally {
      setAccepting(false)
    }
  }

  const reject = async () => {
    if (!actionable || accepting || rejecting) return
    setRejecting(true)
    setActionError(null)
    try {
      await crewService.rejectOffer(id, reason.trim() || undefined)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      navigation.back()
    } catch (err) {
      setActionError((err as Error).message || 'The offer could not be rejected.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      state.refresh()
    } finally {
      setRejecting(false)
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      {state.loading ? <LoadingState message="Loading dispatch offer…" /> : null}
      {state.error ? (
        <ErrorState
          message={state.error}
          actionLabel="Try again"
          onAction={state.reload}
        />
      ) : null}

      {!state.loading && !state.error && !offer ? (
        <Notice tone="warning" text="This offer is no longer available in your offer list." />
      ) : null}

      {!actionable && offer ? (
        <Notice
          tone="warning"
          text={`This offer is ${titleCase(offer.status)}. Only a live, pending offer can be accepted or rejected.`}
        />
      ) : null}
      {actionError ? <Notice tone="danger" text={actionError} /> : null}

      {booking ? (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <Badge label="Offer" tone="warning" icon="flash-outline" />
              {offer ? (
                <Badge
                  label={offer.isLive ? 'Live' : 'Not live'}
                  tone={offer.isLive ? 'success' : 'neutral'}
                />
              ) : null}
            </View>
            <AppText variant="display" style={styles.title}>
              {booking.reference}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {booking.emergencyCategory
                ? emergencyCategoryLabel(booking.emergencyCategory)
                : 'Category not provided'}
            </AppText>
          </Card>

          <Card>
            <AppText variant="heading">Pickup</AppText>
            <AppText variant="body" style={styles.spaced}>
              {booking.pickupAddress}
            </AppText>
            {booking.landmark ? (
              <AppText variant="caption" color="textMuted">
                Landmark: {booking.landmark}
              </AppText>
            ) : null}
            <AppText variant="micro" color="textFaint" style={styles.spaced}>
              {booking.pickupLat}, {booking.pickupLng}
            </AppText>
          </Card>

          <Card>
            <AppText variant="heading">Destination</AppText>
            <AppText variant="body" style={styles.spaced}>
              {booking.destAddress || 'Destination address not provided'}
            </AppText>
            {booking.destLat != null && booking.destLng != null ? (
              <AppText variant="micro" color="textFaint" style={styles.spaced}>
                {booking.destLat}, {booking.destLng}
              </AppText>
            ) : null}
          </Card>

          <Card>
            <AppText variant="heading">Trip details</AppText>
            <DetailRow label="Distance" value={formatDistance(booking.distanceKm)} />
            <DetailRow label="Confirmed fare" value={formatNaira(booking.estimatedFare)} />
            <DetailRow label="Offered at" value={formatDateTime(offer?.offeredAt)} />
            <DetailRow label="Expires at" value={formatDateTime(offer?.expiresAt)} />
            {booking.callbackPhone ? (
              <DetailRow label="Callback" value={booking.callbackPhone} />
            ) : null}
          </Card>

          <Notice
            tone="info"
            text="Accepting assigns this trip to you. Do not accept until you are ready to respond."
          />

          <PrimaryButton
            label={accepting ? 'Accepting…' : 'Accept offer'}
            onPress={() => void accept()}
            loading={accepting}
            disabled={!actionable || accepting || rejecting}
            icon="checkmark-circle-outline"
          />

          <Card>
            <AppText variant="heading">Reject this offer</AppText>
            <AppText variant="caption" color="textMuted">
              Optional reason. The booking returns to dispatch for another attempt.
            </AppText>
            <AppInput
              label="Reason (optional)"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. vehicle unavailable"
              maxLength={500}
            />
            <SecondaryButton
              label={rejecting ? 'Rejecting…' : 'Reject offer'}
              onPress={() => void reject()}
              loading={rejecting}
              disabled={!actionable || accepting || rejecting}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const t = useAppTheme()
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="label" style={{ color: t.colors.text }}>
        {value}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 12 },
  spaced: { marginTop: 8 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
})
