import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { InterswitchGateway } from '@/components/InterswitchGateway'
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Screen,
  SectionHeader,
  SkeletonCard,
  TextField,
} from '@/components/ui'
import { useAsync } from '@/hooks/useAsync'
import { insuranceService } from '@/services/insurance.service'
import { paymentService } from '@/services/payment.service'
import { savingsService } from '@/services/savings.service'
import { useAppTheme } from '@/theme'
import type { InsuranceEligibility, InterswitchPayload } from '@/types'
import { formatDate, formatNaira } from '@/utils/format'

const INSURERS = ['Hygeia HMO', 'Reliance Health', 'AXA Mansard', 'Leadway Health']

export default function VaultScreen() {
  const t = useAppTheme()

  const state = useAsync(() => savingsService.list(), [])
  const goals = state.data?.goals ?? []

  const [insurer, setInsurer] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [eligibility, setEligibility] = useState<InsuranceEligibility | null>(null)
  const [insuranceError, setInsuranceError] = useState<string | null>(null)

  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [payload, setPayload] = useState<InterswitchPayload | null>(null)
  const [txnRef, setTxnRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkEligibility = async () => {
    if (!insurer) return
    setChecking(true)
    setInsuranceError(null)
    try {
      const result = await insuranceService.checkEligibility(insurer)
      setEligibility(result)
      void Haptics.notificationAsync(
        result.isSupported ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      )
    } catch (err) {
      setInsuranceError((err as Error).message || 'Could not check eligibility.')
    } finally {
      setChecking(false)
    }
  }

  const startContribution = async () => {
    if (!addingTo) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await paymentService.initialize({
        type: 'SAVINGS',
        savingsGoalId: addingTo,
        amountKobo: Math.round(value * 100),
        method: 'CARD',
      })
      if (!res.interswitchPayload) {
        setError('The gateway is unavailable right now. Please try again.')
        return
      }
      setTxnRef(res.payment.transactionRef)
      setPayload(res.interswitchPayload)
    } catch (err) {
      setError((err as Error).message || 'Could not start the contribution.')
    } finally {
      setBusy(false)
    }
  }

  const handleGatewayRedirect = useCallback(async () => {
    if (!txnRef) return
    setBusy(true)
    try {
      await paymentService.verify(txnRef, false)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setPayload(null)
      setAddingTo(null)
      setAmount('')
      state.refresh()
    } catch (err) {
      setError((err as Error).message || 'We could not confirm the contribution yet.')
      setPayload(null)
    } finally {
      setBusy(false)
    }
  }, [txnRef, state])

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
      <AppText variant="display">Health Vault</AppText>
      <AppText variant="body" color="textMuted" style={styles.subtitle}>
        Your medical reserve and insurance benefits.
      </AppText>

      {/* HMO eligibility */}
      <Card style={styles.hmoCard}>
        <View style={styles.hmoHeader}>
          <View style={[styles.hmoIcon, { backgroundColor: t.colors.infoSoft, borderRadius: t.radius.md }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={t.colors.info} />
          </View>
          <View style={styles.hmoTitle}>
            <AppText variant="subheading">HMO direct co-pay</AppText>
            <AppText variant="caption" color="textMuted">
              Check if your insurer is integrated for 80% coverage.
            </AppText>
          </View>
        </View>

        <View style={styles.insurerChips}>
          {INSURERS.map((name) => {
            const active = insurer === name
            return (
              <Pressable
                key={name}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {})
                  setInsurer(name)
                  setEligibility(null)
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[
                  styles.insurerChip,
                  {
                    backgroundColor: active ? t.colors.primary : t.colors.surfaceAlt,
                    borderColor: active ? t.colors.primary : t.colors.border,
                  },
                ]}
              >
                <AppText variant="caption" color={active ? 'onPrimary' : 'textMuted'}>
                  {name}
                </AppText>
              </Pressable>
            )
          })}
        </View>

        <Button
          label="Check eligibility"
          size="sm"
          variant="secondary"
          onPress={() => void checkEligibility()}
          loading={checking}
          disabled={!insurer}
        />

        {insuranceError ? (
          <AppText variant="caption" color="emergency">
            {insuranceError}
          </AppText>
        ) : null}

        {eligibility ? (
          <View
            style={[
              styles.eligibility,
              {
                backgroundColor: eligibility.isSupported ? t.colors.successSoft : t.colors.warningSoft,
                borderRadius: t.radius.md,
              },
            ]}
          >
            <Ionicons
              name={eligibility.isSupported ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={19}
              color={eligibility.isSupported ? t.colors.success : t.colors.warning}
            />
            <View style={styles.eligibilityText}>
              <AppText variant="bodyStrong" color={eligibility.isSupported ? 'success' : 'warning'}>
                {eligibility.statusLabel}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {eligibility.message}
              </AppText>
            </View>
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Emergency reserves" subtitle="Set aside funds for urgent transport" />

      {state.loading && !state.data ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
        </View>
      ) : state.error && !state.data ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Couldn't load your vault"
          message={state.error}
          actionLabel="Try again"
          onAction={state.reload}
        />
      ) : goals.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title="No goals yet" message="Your emergency reserve will appear here." />
      ) : (
        <View style={styles.goals}>
          {goals.map((goal) => {
            const target = Math.max(1, goal.targetAmountKobo)
            const progress = Math.min(1, goal.currentAmountKobo / target)
            const expanded = addingTo === goal.id
            return (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <AppText variant="subheading" numberOfLines={2} style={styles.goalTitle}>
                    {goal.title}
                  </AppText>
                  <Badge label={`${Math.round(progress * 100)}%`} tone={progress >= 1 ? 'success' : 'primary'} />
                </View>

                <AppText variant="bodyStrong" color="primary">
                  {formatNaira(goal.currentAmountKobo)}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  of {formatNaira(target)} target
                </AppText>
                <ProgressBar value={progress} tone={progress >= 1 ? 'success' : 'primary'} />

                <AppText variant="caption" color="textFaint">
                  {goal.contributions.length} contribution{goal.contributions.length === 1 ? '' : 's'} · updated{' '}
                  {formatDate(goal.updatedAt)}
                </AppText>

                {expanded ? (
                  <View style={styles.contributeBox}>
                    <TextField
                      label="Contribution (₦)"
                      value={amount}
                      onChangeText={(value) => {
                        setAmount(value.replace(/[^\d.]/g, ''))
                        setError(null)
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    {error ? (
                      <AppText variant="caption" color="emergency">
                        {error}
                      </AppText>
                    ) : null}
                    <View style={styles.contributeActions}>
                      <Button label="Cancel" variant="ghost" size="sm" fullWidth={false} onPress={() => setAddingTo(null)} />
                      <Button label="Add funds" size="sm" fullWidth={false} onPress={() => void startContribution()} loading={busy} />
                    </View>
                  </View>
                ) : (
                  <Button
                    label="Add funds"
                    icon="add-outline"
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setAddingTo(goal.id)
                      setAmount('')
                      setError(null)
                    }}
                  />
                )}
              </Card>
            )
          })}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  subtitle: { marginTop: 4, marginBottom: 18 },
  hmoCard: { gap: 12 },
  hmoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hmoIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  hmoTitle: { flex: 1, gap: 2 },
  insurerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  insurerChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  eligibility: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12 },
  eligibilityText: { flex: 1, gap: 2 },
  skeletons: { marginTop: 12 },
  goals: { gap: 12 },
  goalCard: { gap: 8 },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  goalTitle: { flex: 1 },
  contributeBox: { gap: 10, paddingTop: 4 },
  contributeActions: { flexDirection: 'row', gap: 8 },
})
