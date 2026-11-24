import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { RoleGate } from '@/components/RoleGate'
import { MapCanvas, type MapMarker } from '@/components/MapCanvas'
import {
  AppText,
  Badge,
  Card,
  ConfirmationSheet,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
} from '@/components/ui'
import { useJourneyLocation } from '@/hooks/useJourneyLocation'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { useJourneyStore } from '@/store/journeyStore'
import { useAppTheme } from '@/theme'
import { formatDateTime } from '@/utils/format'

function timeLabel(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function JourneyLiveContent() {
  const navigation = useSafeNavigation()
  const t = useAppTheme()
  const session = useJourneyStore((state) => state.session)
  const stop = useJourneyStore((state) => state.stop)
  const clear = useJourneyStore((state) => state.clear)
  const [stopOpen, setStopOpen] = useState(false)

  useJourneyLocation()

  const isActive = session?.status === 'active'
  const lastFix = session?.lastFix ?? null

  const markers: MapMarker[] = useMemo(() => {
    if (!session) return []
    const result: MapMarker[] = [
      {
        id: 'start',
        latitude: session.pickup.lat,
        longitude: session.pickup.lng,
        kind: 'user',
        label: 'Starting point',
      },
      {
        id: 'destination',
        latitude: session.destination.latitude,
        longitude: session.destination.longitude,
        kind: 'hospital',
        label: session.destination.name,
      },
    ]
    if (lastFix) {
      result.push({
        id: 'current',
        latitude: lastFix.latitude,
        longitude: lastFix.longitude,
        kind: 'user',
        label: 'Your last position',
      })
    }
    return result
  }, [session, lastFix])

  const caption = !session
    ? 'NO ACTIVE JOURNEY'
    : lastFix && isActive && !session.locationError
      ? `LIVE ON THIS DEVICE · ${timeLabel(lastFix.recordedAt)}`
      : lastFix
        ? `LAST UPDATED ${timeLabel(lastFix.recordedAt)} · updates paused`
        : isActive
          ? 'WAITING FOR FIRST GPS FIX'
          : 'TRACKING STOPPED'

  if (!session) {
    return (
      <Screen safeTop={false}>
        <View style={styles.empty}>
          <Notice text="You do not have an active journey on this device." tone="info" />
          <PrimaryButton label="Set up journey tracking" icon="navigate-outline" onPress={() => navigation.replace('/journey/setup')} />
          <SecondaryButton label="Back to home" icon="home-outline" onPress={() => navigation.replace('/(tabs)')} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      scroll
      safeTop={false}
      contentContainerStyle={styles.content}
      footer={
        <View style={styles.footer}>
          {isActive ? (
            <SecondaryButton label="Stop tracking" icon="stop-circle-outline" onPress={() => setStopOpen(true)} />
          ) : (
            <>
              <PrimaryButton
                label="Start another journey"
                icon="navigate-outline"
                onPress={() => {
                  clear()
                  navigation.replace('/journey/setup')
                }}
              />
              <SecondaryButton label="Back to home" icon="home-outline" onPress={() => navigation.replace('/(tabs)')} />
            </>
          )}
        </View>
      }
    >
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.cardHeading}>
            <AppText variant="label" color="textMuted">
              DESTINATION
            </AppText>
            <AppText variant="subheading" numberOfLines={1}>
              {session.destination.name}
            </AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {session.destination.address}
            </AppText>
          </View>
          <Badge label={isActive ? 'On this device' : 'Stopped'} tone={isActive ? 'info' : 'neutral'} />
        </View>
      </Card>

      <MapCanvas
        markers={markers}
        route={session.trail}
        height={280}
        caption={caption}
        accessibilityLabel="Map showing your last GPS position, starting point and destination hospital"
      />

      {session.locationError ? (
        <Notice text={session.locationError} tone="warning" />
      ) : isActive && lastFix ? (
        <Notice text={`Location is updating while this screen is open. Last fix ${timeLabel(lastFix.recordedAt)}.`} tone="success" />
      ) : null}

      <Card style={styles.card}>
        <SectionHeader title="Position details" />
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color={t.colors.textMuted} />
          <View style={styles.cardHeading}>
            <AppText variant="label" color="textMuted">
              LAST SUCCESSFUL UPDATE
            </AppText>
            <AppText variant="body">
              {lastFix ? formatDateTime(lastFix.recordedAt) : 'No GPS fix recorded yet'}
            </AppText>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="locate-outline" size={18} color={t.colors.textMuted} />
          <View style={styles.cardHeading}>
            <AppText variant="label" color="textMuted">
              ACCURACY
            </AppText>
            <AppText variant="body">
              {lastFix?.accuracyMeters != null
                ? `Within about ${Math.round(lastFix.accuracyMeters)} m`
                : 'Not reported'}
            </AppText>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="analytics-outline" size={18} color={t.colors.textMuted} />
          <View style={styles.cardHeading}>
            <AppText variant="label" color="textMuted">
              GPS TRAIL
            </AppText>
            <AppText variant="body">{session.trail.length} recorded point(s)</AppText>
          </View>
        </View>
      </Card>

      <Notice
        text="This is your own journey, not a MediMove ambulance request. No dispatch has been created and ETA is unavailable without routing data."
        tone="info"
      />
      <Notice
        text="Live sharing is not available yet. Your position is shown only on this device until backend journey sharing is added."
        tone="warning"
      />

      <ConfirmationSheet
        visible={stopOpen}
        onClose={() => setStopOpen(false)}
        title="Stop journey tracking?"
        message="Your last position will stay on this device, but updates will stop."
        confirmLabel="Stop tracking"
        cancelLabel="Keep tracking"
        destructive
        onConfirm={() => {
          stop()
          setStopOpen(false)
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24 },
  empty: { flex: 1, justifyContent: 'center', gap: 12 },
  card: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardHeading: { flex: 1, gap: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  footer: { gap: 10 },
})

export default function JourneyLiveScreen() {
  return (
    <RoleGate allow={['PATIENT']}>
      <JourneyLiveContent />
    </RoleGate>
  )
}
