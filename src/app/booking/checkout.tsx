import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { InterswitchGateway } from '@/components/InterswitchGateway'
import { RoleGate } from '@/components/RoleGate'
import { AppText, Badge, Button, Card, EmptyState, Screen, SkeletonCard } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { bookingService } from '@/services/booking.service'
import { paymentService } from '@/services/payment.service'
import { useAppTheme } from '@/theme'
import type { InterswitchPayload } from '@/types'
import { formatNaira, titleCase } from '@/utils/format'

function CheckoutContent() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const navigation = useSafeNavigation()
  const t = useAppTheme()

  const state = useAsync(() => bookingService.get(bookingId), [bookingId])
  const booking = state.data?.booking ?? null

  const [busy, setBusy] = useState<'wallet' | 'card' | null>(null)
  const [payload, setPayload] = useState<InterswitchPayload | null>(null)
  const [txnRef, setTxnRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const goToTracking = () => {
    if (bookingId) navigation.replace({ pathname: '/booking/[id]', params: { id: bookingId } })
    else navigation.back()
  }

  const payWithWallet = async () => {
    if (!bookingId) return
    setBusy('wallet')
    setError(null)
    try {
      await paymentService.payWithWallet(bookingId)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      goToTracking()
    } catch (err) {
      setError((err as Error).message || 'Wallet payment failed.')
    } finally {
      setBusy(null)
    }
  }

  const startCardPayment = async () => {
    if (!bookingId) return
    setBusy('card')
    setError(null)
    try {
      const res = await paymentService.initialize({ type: 'BOOKING', bookingId, method: 'CARD' })
      if (!res.interswitchPayload) {
        setError('The payment gateway did not return a checkout session. Please try again.')
        return
      }
      setTxnRef(res.payment.transactionRef)
      setPayload(res.interswitchPayload)
    } catch (err) {
      setError((err as Error).message || 'Could not start card payment.')
    } finally {
      setBusy(null)
    }
  }

  const handleGatewayRedirect = async () => {
    if (!txnRef) return
    setBusy('card')
    setError(null)
    try {
      const result = await paymentService.verify(txnRef, false)
      if (result.status !== 'SUCCESSFUL') {
        setError(result.message || 'The gateway did not confirm this payment yet.')
        setPayload(null)
        return
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setPayload(null)
      goToTracking()
    } catch (err) {
      setError((err as Error).message || 'We could not confirm this payment yet.')
      setPayload(null)
    } finally {
      setBusy(null)
    }
  }

  if (payload) {
    return (
      <View style={styles.flex}>
        <InterswitchGateway payload={payload} onRedirect={() => void handleGatewayRedirect()} />
      </View>
    )
  }

  if (state.loading && !booking) {
    return (
      <Screen padded={false}>
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
        </View>
      </Screen>
    )
  }

  if (!booking) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Checkout unavailable"
          message={state.error ?? 'This booking could not be found.'}
          actionLabel="Go back"
          onAction={() => navigation.back()}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <AppText variant="display">Checkout</AppText>
      <AppText variant="body" color="textMuted" style={styles.subtitle}>
        Settle this trip securely. We never store card details.
      </AppText>

      <Card style={styles.summary}>
        <View style={styles.summaryTop}>
          <AppText variant="caption" color="textMuted">
            {booking.reference}
          </AppText>
          <Badge label={titleCase(booking.status)} tone="primary" />
        </View>
        <AppText variant="caption" color="textFaint">
          {booking.provider?.name ?? 'Assigned ambulance'}
        </AppText>
        <AppText variant="display" color="primary" style={styles.amount}>
          {formatNaira(booking.estimatedFare)}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={2}>
          To {booking.destAddress || 'your destination'}
        </AppText>
      </Card>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: t.colors.emergencySoft, borderRadius: t.radius.md }]}>
          <AppText variant="caption" color="emergency">
            {error}
          </AppText>
        </View>
      ) : null}

      <AppText variant="label" color="textMuted" style={styles.sectionLabel}>
        Payment method
      </AppText>

      <Card style={styles.methods}>
        <View style={styles.methodRow}>
          <View style={[styles.methodIcon, { backgroundColor: t.colors.successSoft }]}>
            <Ionicons name="wallet-outline" size={21} color={t.colors.success} />
          </View>
          <View style={styles.methodText}>
            <AppText variant="subheading">Health wallet</AppText>
            <AppText variant="caption" color="textMuted">
              Pay instantly from your balance
            </AppText>
          </View>
          <Button
            label={busy === 'wallet' ? 'Paying…' : 'Pay'}
            size="sm"
            fullWidth={false}
            onPress={() => void payWithWallet()}
            loading={busy === 'wallet'}
            disabled={busy !== null}
          />
        </View>

        <View style={styles.methodRow}>
          <View style={[styles.methodIcon, { backgroundColor: t.colors.infoSoft }]}>
            <Ionicons name="card-outline" size={21} color={t.colors.info} />
          </View>
          <View style={styles.methodText}>
            <AppText variant="subheading">Card / bank transfer</AppText>
            <AppText variant="caption" color="textMuted">
              Secure Interswitch checkout
            </AppText>
          </View>
          <Button
            label={busy === 'card' ? 'Opening…' : 'Pay'}
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => void startCardPayment()}
            loading={busy === 'card'}
            disabled={busy !== null}
          />
        </View>
      </Card>

      <View style={[styles.cashNote, { backgroundColor: t.colors.surface, borderRadius: t.radius.md, borderColor: t.colors.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={t.colors.textFaint} />
        <AppText variant="caption" color="textMuted">
          Cash payments are recorded by the crew when they arrive.
        </AppText>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skeletons: { paddingTop: 16 },
  subtitle: { marginTop: 4, marginBottom: 18 },
  summary: { gap: 6 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { marginTop: 6, marginBottom: 2 },
  errorBox: { padding: 12, marginTop: 14 },
  sectionLabel: { marginTop: 24, marginBottom: 8, textTransform: 'uppercase' },
  methods: { gap: 16 },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodText: { flex: 1, gap: 2 },
  cashNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, marginTop: 16, borderWidth: StyleSheet.hairlineWidth },
})

export default function CheckoutScreen() {
  return (
    <RoleGate allow={['PATIENT']}>
      <CheckoutContent />
    </RoleGate>
  )
}
