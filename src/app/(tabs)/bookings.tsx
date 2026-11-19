import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { AppText, Badge, EmptyState, Screen, SectionHeader, SkeletonCard } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { bookingService } from '@/services/booking.service'
import { useAppTheme } from '@/theme'
import type { Booking, BookingStatus } from '@/types'
import { bookingStatusMeta, emergencyCategoryLabel, formatDate, formatNaira, titleCase } from '@/utils/format'

const TERMINAL: BookingStatus[] = ['COMPLETED', 'CANCELLED', 'FAILED']

export default function BookingsScreen() {
  const router = useRouter()
  const t = useAppTheme()

  const state = useAsync(() => bookingService.list({ limit: 30 }), [])

  const { active, past } = useMemo(() => {
    const all = state.data?.bookings ?? []
    return {
      active: all.filter((b) => !TERMINAL.includes(b.status)),
      past: all.filter((b) => TERMINAL.includes(b.status)),
    }
  }, [state.data])

  const open = (id: string) => router.push({ pathname: '/booking/[id]', params: { id } })

  const renderBooking = (booking: Booking) => {
    const meta = bookingStatusMeta(booking.status)
    const isActive = !TERMINAL.includes(booking.status)
    return (
      <Pressable
        key={booking.id}
        onPress={() => open(booking.id)}
        accessibilityRole="button"
        accessibilityLabel={`Booking ${booking.reference}, ${meta.label}`}
        android_ripple={{ color: t.colors.surfaceAlt }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: t.colors.surface,
            borderColor: isActive ? t.colors.primary : t.colors.border,
            borderRadius: t.radius.lg,
          },
          pressed && Platform.OS === 'ios' ? { opacity: 0.85 } : null,
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.refWrap}>
            <Ionicons name="receipt-outline" size={17} color={t.colors.textFaint} />
            <AppText variant="label">{booking.reference}</AppText>
          </View>
          <Badge label={meta.label} tone={meta.tone} />
        </View>

        <View style={styles.route}>
          <View style={styles.routeLine}>
            <View style={[styles.routeDot, { backgroundColor: t.colors.primary }]} />
            <View style={[styles.routeConnector, { backgroundColor: t.colors.borderStrong }]} />
            <View style={[styles.routeDot, { borderColor: t.colors.info, borderWidth: 2 }]} />
          </View>
          <View style={styles.routeText}>
            <AppText variant="body" numberOfLines={1}>
              {booking.pickupAddress || 'Your location'}
            </AppText>
            <AppText variant="body" numberOfLines={1}>
              {booking.destAddress || 'Destination'}
            </AppText>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.meta}>
            <AppText variant="caption" color="textMuted">
              {formatDate(booking.createdAt)}
            </AppText>
            {booking.emergencyCategory ? (
              <AppText variant="caption" color="textFaint">
                {emergencyCategoryLabel(booking.emergencyCategory)}
              </AppText>
            ) : null}
          </View>
          <AppText variant="bodyStrong" color={isActive ? 'primary' : 'text'}>
            {formatNaira(booking.estimatedFare)}
          </AppText>
        </View>

        {isActive ? (
          <View style={[styles.trackRow, { backgroundColor: t.colors.primarySoft, borderRadius: t.radius.md }]}>
            <AppText variant="caption" color="primary">
              {titleCase(booking.status)} · Tap to track
            </AppText>
            <Ionicons name="navigate" size={15} color={t.colors.primary} />
          </View>
        ) : null}
      </Pressable>
    )
  }

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={t.colors.primary} />}
    >
      <AppText variant="display">Activity</AppText>
      <AppText variant="body" color="textMuted" style={styles.subtitle}>
        Every ambulance request, in one place.
      </AppText>

      {state.loading && !state.data ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      ) : state.error && !state.data ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load your activity"
          message={state.error}
          actionLabel="Try again"
          onAction={state.reload}
        />
      ) : active.length === 0 && past.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No requests yet"
          message="When you dispatch an ambulance, you'll be able to track it here."
        />
      ) : (
        <>
          {active.length > 0 ? (
            <>
              <SectionHeader title="In progress" subtitle="Live and recently requested" />
              <View style={styles.list}>{active.map(renderBooking)}</View>
            </>
          ) : null}

          {past.length > 0 ? (
            <>
              <SectionHeader title="Past requests" subtitle={`${past.length} completed or closed`} />
              <View style={styles.list}>{past.map(renderBooking)}</View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 4, marginBottom: 4 },
  skeletons: { gap: 12, marginTop: 20 },
  list: { gap: 12 },
  card: { borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  refWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  route: { flexDirection: 'row', gap: 12 },
  routeLine: { alignItems: 'center', width: 12, paddingVertical: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeConnector: { width: 2, flex: 1, minHeight: 18, marginVertical: 3 },
  routeText: { flex: 1, justifyContent: 'space-between', gap: 10 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  meta: { gap: 2 },
  trackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
})
