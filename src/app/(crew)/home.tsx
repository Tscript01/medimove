import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import {
  AppHeader,
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  Screen,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { crewService } from '@/services/crew.service'
import { useAuthStore } from '@/store/authStore'
import { useAppTheme } from '@/theme'
import type { AvailabilityStatus, Booking, DispatchOffer } from '@/types'
import { bookingStatusMeta, formatDateTime, formatDistance, formatNaira } from '@/utils/format'

const AVAILABILITY: { value: AvailabilityStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ON_DUTY', label: 'On duty' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
]

function OfferCard({ offer, onPress }: { offer: DispatchOffer; onPress: () => void }) {
  const t = useAppTheme()
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Offer round ${offer.round}, opens offer detail`}
      borderColor="primary"
    >
      <View style={styles.rowBetween}>
        <Badge label="Offer" tone="warning" icon="flash-outline" />
        <AppText variant="micro" color="textMuted">
          Round {offer.round}
        </AppText>
      </View>
      <AppText variant="heading" style={styles.cardTitle}>
        New dispatch offer
      </AppText>
      <AppText variant="caption" color="textMuted">
        {offer.distanceKm == null ? 'Distance not provided' : `${formatDistance(offer.distanceKm)} from pickup`}
        {offer.capabilityMatch ? ' · Capability match' : ''}
      </AppText>
      <AppText variant="micro" color="textFaint" style={styles.cardFoot}>
        {offer.expiresAt ? `Expires ${formatDateTime(offer.expiresAt)}` : 'Expiry time not provided'}
      </AppText>
      <View style={[styles.accentBar, { backgroundColor: t.colors.warning }]} />
    </Card>
  )
}

function TripCard({ trip, onPress }: { trip: Booking; onPress: () => void }) {
  const meta = bookingStatusMeta(trip.status)
  return (
    <Card onPress={onPress} accessibilityLabel={`Assigned trip ${trip.reference}, opens trip`}>
      <View style={styles.rowBetween}>
        <Badge label="Assigned trip" tone="primary" icon="navigate-outline" />
        <Badge label={meta.label} tone={meta.tone} />
      </View>
      <AppText variant="heading" style={styles.cardTitle}>
        {trip.reference}
      </AppText>
      <AppText variant="caption" color="textMuted" numberOfLines={2}>
        Pickup: {trip.pickupAddress}
      </AppText>
      <View style={styles.rowBetween}>
        <AppText variant="micro" color="textFaint">
          {formatDistance(trip.distanceKm)} · {formatNaira(trip.estimatedFare)}
        </AppText>
        <AppText variant="micro" color="primary">
          Open trip
        </AppText>
      </View>
    </Card>
  )
}

export default function CrewHomeScreen() {
  const t = useAppTheme()
  const navigation = useSafeNavigation()
  const fullName = useAuthStore((state) => state.user?.fullName ?? 'Crew member')

  const profileState = useAsync(() => crewService.me(), [])
  const offersState = useAsync(() => crewService.offers(), [])
  const tripsState = useAsync(() => crewService.trips({ active: 'true' }), [])
  const [availabilityBusy, setAvailabilityBusy] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const crew = profileState.data?.crew ?? null
  const isActive = crew?.status === 'ACTIVE'
  const isVerified = crew?.verificationStatus === 'VERIFIED'
  const canGoOnDuty = isActive && isVerified

  const liveOffers = (offersState.data?.offers ?? []).filter(
    (offer) => offer.status === 'PENDING' && offer.isLive,
  )
  const trips = tripsState.data?.trips ?? []
  const refreshing = profileState.refreshing || offersState.refreshing || tripsState.refreshing

  const refreshAll = () => {
    profileState.refresh()
    offersState.refresh()
    tripsState.refresh()
  }

  const changeAvailability = async (availability: AvailabilityStatus) => {
    if (availabilityBusy || crew?.availability === availability) return
    setAvailabilityBusy(true)
    setAvailabilityError(null)
    try {
      const response = await crewService.setAvailability(availability)
      profileState.setData(response)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } catch (err) {
      setAvailabilityError((err as Error).message || 'Availability could not be updated.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setAvailabilityBusy(false)
    }
  }

  const profileError = profileState.error ?? offersState.error ?? tripsState.error

  return (
    <Screen
      header={
        <AppHeader
          title="Crew home"
          subtitle={fullName}
          right={
            <Pressable
              onPress={() => navigation.navigate('/(crew)/profile')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Open crew profile"
            >
              <Ionicons name="person-circle-outline" size={28} color={t.colors.primary} />
            </Pressable>
          }
          hideDivider
        />
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
      contentStyle={styles.content}
    >
      {!isActive || !isVerified ? (
        <Notice
          tone="warning"
          text={
            !isActive
              ? 'Your crew account is not active. Availability and offers are unavailable.'
              : 'Your crew account is not verified. You cannot go on duty until verification is approved.'
          }
        />
      ) : null}
      {availabilityError ? <Notice tone="danger" text={availabilityError} /> : null}

      <Card>
        <View style={styles.rowBetween}>
          <AppText variant="heading">Your availability</AppText>
          {crew ? (
            <Badge
              label={crew.verificationStatus === 'VERIFIED' ? 'Verified' : 'Pending verification'}
              tone={isVerified ? 'success' : 'warning'}
              icon={isVerified ? 'checkmark-circle-outline' : 'time-outline'}
            />
          ) : null}
        </View>
        <AppText variant="caption" color="textMuted">
          Offers only arrive when you are Available or On duty. You control this yourself.
        </AppText>
        <View style={styles.availabilityGrid}>
          {AVAILABILITY.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              size="sm"
              variant={crew?.availability === option.value ? 'primary' : 'secondary'}
              disabled={availabilityBusy || !canGoOnDuty}
              loading={availabilityBusy && crew?.availability !== option.value}
              onPress={() => void changeAvailability(option.value)}
            />
          ))}
        </View>
        {crew?.assignedAmbulanceId ? (
          <AppText variant="micro" color="textFaint">
            Assigned vehicle: {crew.assignedAmbulanceId}
          </AppText>
        ) : (
          <AppText variant="micro" color="textFaint">
            No vehicle assigned yet.
          </AppText>
        )}
      </Card>

      <View style={styles.section}>
        <AppText variant="title">Active offers</AppText>
        <AppText variant="caption" color="textMuted">
          An offer is a request to accept, not an assigned trip. It expires automatically.
        </AppText>
        {offersState.loading ? <LoadingState compact lines={2} message="Checking for offers…" /> : null}
        {profileError ? (
          <ErrorState
            compact
            message={profileError}
            actionLabel="Try again"
            onAction={refreshAll}
          />
        ) : null}
        {liveOffers.length > 0
          ? liveOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onPress={() =>
                  navigation.navigate({ pathname: '/(crew)/offer/[id]', params: { id: offer.id } })
                }
              />
            ))
          : !offersState.loading && !profileError
            ? (
              <EmptyState
                compact
                icon="notifications-outline"
                title="No active offers"
                message="Offers from dispatch will appear here while you are on duty."
              />
            )
          : null}
      </View>

      <View style={styles.section}>
        <AppText variant="title">Assigned trips</AppText>
        <AppText variant="caption" color="textMuted">
          These are trips you have already accepted. Advance them one milestone at a time.
        </AppText>
        {tripsState.loading ? <LoadingState compact lines={2} message="Loading trips…" /> : null}
        {trips.length > 0
          ? trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() =>
                  navigation.navigate({ pathname: '/(crew)/trip/[id]', params: { id: trip.id } })
                }
              />
            ))
          : !tripsState.loading
            ? (
              <EmptyState
                compact
                icon="navigate-outline"
                title="No active trips"
                message="Accepted trips will appear here until you complete them."
              />
            )
          : null}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { gap: 20 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { marginTop: 10 },
  cardFoot: { marginTop: 6 },
  accentBar: { height: 4, borderRadius: 2, marginTop: 12 },
  availabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  section: { gap: 10 },
})
