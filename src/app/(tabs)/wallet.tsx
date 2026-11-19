import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { RefreshControl, StyleSheet, View } from 'react-native'
import { InterswitchGateway } from '@/components/InterswitchGateway'
import { AppText, Badge, Button, Card, EmptyState, Screen, SectionHeader, SkeletonCard, TextField } from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { paymentService } from '@/services/payment.service'
import { walletService } from '@/services/wallet.service'
import { useAppTheme } from '@/theme'
import type { InterswitchPayload, Payment } from '@/types'
import { formatDate, formatNaira, formatNairaFromNaira, paymentStatusTone, titleCase } from '@/utils/format'

const QUICK_AMOUNTS = [1000, 2500, 5000]

export default function WalletScreen() {
  const t = useAppTheme()

  const state = useAsync(async () => {
    const [balance, history] = await Promise.all([
      walletService.getBalance(),
      paymentService.history({ limit: 20 }),
    ])
    return { balance, payments: history.payments }
  }, [])

  const [topUpOpen, setTopUpOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [payload, setPayload] = useState<InterswitchPayload | null>(null)
  const [txnRef, setTxnRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const balance = state.data?.balance
  const payments = state.data?.payments ?? []

  const startTopUp = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await walletService.fund(value, 'CARD')
      if (!res.interswitchPayload) {
        setError('The gateway is unavailable right now. Please try again.')
        return
      }
      setTxnRef(res.payment.transactionRef)
      setPayload(res.interswitchPayload)
    } catch (err) {
      setError((err as Error).message || 'Could not start the top-up.')
    } finally {
      setBusy(false)
    }
  }

  const handleGatewayRedirect = async () => {
    if (!txnRef) return
    setBusy(true)
    try {
      await paymentService.verify(txnRef, false)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setPayload(null)
      setAmount('')
      setTopUpOpen(false)
      state.refresh()
    } catch (err) {
      setError((err as Error).message || 'We could not confirm the top-up yet.')
      setPayload(null)
    } finally {
      setBusy(false)
    }
  }

  const renderPayment = (payment: Payment) => (
    <View
      key={payment.id}
      style={[styles.txRow, { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderColor: t.colors.border }]}
    >
      <View style={[styles.txIcon, { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md }]}>
        <Ionicons
          name={payment.amountKobo > 0 && payment.type === 'WALLET_FUNDING' ? 'add-circle-outline' : 'receipt-outline'}
          size={20}
          color={t.colors.textMuted}
        />
      </View>
      <View style={styles.txBody}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {titleCase(payment.type.replace(/_/g, ' '))}
        </AppText>
        <AppText variant="caption" color="textFaint" numberOfLines={1}>
          {payment.transactionRef} · {formatDate(payment.createdAt)}
        </AppText>
      </View>
      <View style={styles.txRight}>
        <AppText variant="bodyStrong" color={payment.status === 'SUCCESSFUL' ? 'success' : 'text'}>
          {payment.type === 'WALLET_FUNDING' ? '+' : ''}
          {formatNaira(payment.amountKobo)}
        </AppText>
        <Badge label={payment.status} tone={paymentStatusTone(payment.status)} />
      </View>
    </View>
  )

  if (payload) {
    return (
      <View style={styles.flex}>
        <InterswitchGateway payload={payload} onRedirect={() => void handleGatewayRedirect()} />
      </View>
    )
  }

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} tintColor={t.colors.primary} />
      }
    >
      <AppText variant="display">Wallet</AppText>
      <AppText variant="body" color="textMuted" style={styles.subtitle}>
        Fund your emergency health balance.
      </AppText>

      {state.loading && !state.data ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </View>
      ) : (
        <>
          <Card style={[styles.balanceCard, { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]} padded>
            <View style={styles.balanceTop}>
              <View style={[styles.balanceIcon, { backgroundColor: t.colors.onPrimaryOverlay }]}>
                <Ionicons name="wallet" size={20} color={t.colors.onPrimary} />
              </View>
              <AppText variant="caption" color="onPrimary">
                Available balance
              </AppText>
            </View>
            <AppText variant="display" color="onPrimary" style={styles.balanceAmount}>
              {formatNaira(balance?.walletBalanceKobo ?? 0)}
            </AppText>
            <AppText variant="caption" color="onPrimary">
              Use this to pay for an ambulance instantly.
            </AppText>
          </Card>

          <View style={styles.topUpArea}>
            {!topUpOpen ? (
              <Button
                label="Add money"
                icon="add-outline"
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {})
                  setTopUpOpen(true)
                }}
              />
            ) : (
              <Card style={styles.topUpCard}>
                <View style={styles.topUpHeader}>
                  <AppText variant="subheading">Top up wallet</AppText>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    onPress={() => {
                      setTopUpOpen(false)
                      setError(null)
                    }}
                  />
                </View>
                <TextField
                  label="Amount (₦)"
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value.replace(/[^\d.]/g, ''))
                    setError(null)
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <View style={styles.quickRow}>
                  {QUICK_AMOUNTS.map((value) => (
                    <Button
                      key={value}
                      label={formatNairaFromNaira(value)}
                      size="sm"
                      variant="secondary"
                      onPress={() => setAmount(String(value))}
                    />
                  ))}
                </View>
                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: t.colors.emergencySoft, borderRadius: t.radius.md }]}>
                    <AppText variant="caption" color="emergency">
                      {error}
                    </AppText>
                  </View>
                ) : null}
                <Button label="Continue to secure checkout" onPress={() => void startTopUp()} loading={busy} icon="card-outline" />
              </Card>
            )}
          </View>

          <SectionHeader title="Transactions" subtitle="Payments and top-ups" />
          {payments.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              message="Top up your wallet or pay for a trip to see activity here."
            />
          ) : (
            <View style={styles.list}>{payments.map(renderPayment)}</View>
          )}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  subtitle: { marginTop: 4, marginBottom: 18 },
  skeletons: { gap: 12 },
  balanceCard: { borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  balanceAmount: { marginTop: 4, marginBottom: 2 },
  topUpArea: { marginTop: 16 },
  topUpCard: { gap: 12 },
  topUpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickRow: { flexDirection: 'row', gap: 8 },
  errorBox: { padding: 10 },
  list: { gap: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderWidth: StyleSheet.hairlineWidth },
  txIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  txBody: { flex: 1, gap: 3 },
  txRight: { alignItems: 'flex-end', gap: 5 },
})
