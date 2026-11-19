import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps, ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useAppTheme, type ThemeColors } from '../../theme'
import type { BadgeTone } from './Badge'
import { AppText } from './AppText'
import { Card } from './Card'
import { StatusBadge } from './StatusBadge'

type IconName = ComponentProps<typeof Ionicons>['name']

interface InteractiveCardProps {
  onPress?: () => void
  accessibilityLabel?: string
  selected?: boolean
}

function useCardChrome(selected?: boolean) {
  const t = useAppTheme()
  return {
    borderColor: selected ? t.colors.primary : t.colors.border,
    backgroundColor: selected ? t.colors.primarySoft : t.colors.surface,
  }
}

/** A labelled place row with a clear action affordance. */
export interface LocationCardProps extends InteractiveCardProps {
  label: string
  value: string
  detail?: string
  icon?: IconName
  actionLabel?: string
}

export function LocationCard({
  label,
  value,
  detail,
  icon = 'location-outline',
  actionLabel,
  onPress,
  accessibilityLabel,
  selected,
}: LocationCardProps) {
  const t = useAppTheme()
  const chrome = useCardChrome(selected)
  const fg: keyof ThemeColors = selected ? 'primary' : 'text'

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      style={[{ backgroundColor: chrome.backgroundColor, borderColor: chrome.borderColor }, styles.location]}
    >
      <View style={[styles.iconTile, { backgroundColor: selected ? t.colors.primary : t.colors.primarySoft }]}>
        <Ionicons name={icon} size={21} color={selected ? t.colors.onPrimary : t.colors.primary} />
      </View>
      <View style={styles.body}>
        <AppText variant="micro" color="textMuted">
          {label.toUpperCase()}
        </AppText>
        <AppText variant="subheading" color={fg} numberOfLines={2}>
          {value}
        </AppText>
        {detail ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {detail}
          </AppText>
        ) : null}
        {actionLabel ? (
          <AppText variant="caption" color="primary">
            {actionLabel}
          </AppText>
        ) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={19} color={t.colors.textFaint} /> : null}
    </Card>
  )
}

/** Compact provider/crew row for the dispatch and tracking screens. */
export interface AmbulanceStatusCardProps extends InteractiveCardProps {
  name: string
  vehicleType?: string
  detail?: string
  badgeLabel?: string
  tone?: 'primary' | 'emergency' | 'success'
  right?: ReactNode
  icon?: IconName
}

export function AmbulanceStatusCard({
  name,
  vehicleType,
  detail,
  badgeLabel,
  tone = 'emergency',
  right,
  icon = 'medical',
  onPress,
  accessibilityLabel,
  selected,
}: AmbulanceStatusCardProps) {
  const t = useAppTheme()
  const chrome = useCardChrome(selected)
  const tones: Record<NonNullable<AmbulanceStatusCardProps['tone']>, { bg: keyof ThemeColors; fg: keyof ThemeColors }> = {
    primary: { bg: 'primarySoft', fg: 'primary' },
    emergency: { bg: 'emergencySoft', fg: 'emergency' },
    success: { bg: 'successSoft', fg: 'success' },
  }
  const tile = tones[tone]

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? name}
      style={[{ backgroundColor: chrome.backgroundColor, borderColor: chrome.borderColor }, styles.row]}
    >
      <View style={[styles.iconTile, { backgroundColor: t.colors[tile.bg] }]}>
        <Ionicons name={icon} size={21} color={t.colors[tile.fg]} />
      </View>
      <View style={styles.body}>
        <AppText variant="subheading" numberOfLines={1}>
          {name}
        </AppText>
        {vehicleType || detail ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {[vehicleType, detail].filter(Boolean).join(' · ')}
          </AppText>
        ) : null}
        {badgeLabel ? (
          <View style={styles.badgeWrap}>
            <StatusBadge status={badgeLabel} tone={tone === 'emergency' ? 'danger' : tone} />
          </View>
        ) : null}
      </View>
      {right}
      {onPress ? (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? t.colors.primary : t.colors.textFaint}
        />
      ) : null}
    </Card>
  )
}

/** Reusable trip overview used by Activity and tracking. */
export interface TripSummaryCardProps extends InteractiveCardProps {
  reference: string
  status: string
  statusTone?: BadgeTone
  pickup: string
  destination: string
  amount: string
  meta?: string
  footer?: ReactNode
}

export function TripSummaryCard({
  reference,
  status,
  statusTone,
  pickup,
  destination,
  amount,
  meta,
  footer,
  onPress,
  accessibilityLabel,
  selected,
}: TripSummaryCardProps) {
  const t = useAppTheme()
  const chrome = useCardChrome(selected)

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `Trip ${reference}, ${status}`}
      style={[{ backgroundColor: chrome.backgroundColor, borderColor: chrome.borderColor }, styles.trip]}
    >
      <View style={styles.tripTop}>
        <AppText variant="label">{reference}</AppText>
        <StatusBadge status={status} tone={statusTone} />
      </View>

      <View style={styles.route}>
        <View style={styles.routeLine}>
          <View style={[styles.routeDot, { backgroundColor: t.colors.primary }]} />
          <View style={[styles.routeConnector, { backgroundColor: t.colors.borderStrong }]} />
          <View style={[styles.routeDot, { borderColor: t.colors.secondary, borderWidth: 2 }]} />
        </View>
        <View style={styles.routeText}>
          <AppText variant="body" numberOfLines={1}>
            {pickup}
          </AppText>
          <AppText variant="body" numberOfLines={1}>
            {destination}
          </AppText>
        </View>
      </View>

      <View style={styles.tripBottom}>
        <View style={styles.tripMeta}>
          {meta ? (
            <AppText variant="caption" color="textMuted">
              {meta}
            </AppText>
          ) : null}
        </View>
        <AppText variant="bodyStrong" color={selected ? 'primary' : 'text'}>
          {amount}
        </AppText>
      </View>

      {footer}
    </Card>
  )
}

const styles = StyleSheet.create({
  location: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconTile: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  badgeWrap: { marginTop: 4, alignSelf: 'flex-start' },
  trip: { gap: 14 },
  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  route: { flexDirection: 'row', gap: 12 },
  routeLine: { alignItems: 'center', width: 12, paddingVertical: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeConnector: { width: 2, flex: 1, minHeight: 18, marginVertical: 3 },
  routeText: { flex: 1, justifyContent: 'space-between', gap: 10 },
  tripBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tripMeta: { flex: 1 },
})
