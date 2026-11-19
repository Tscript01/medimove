import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'
import { AppText } from './AppText'
import { Button } from './Button'

type IconName = ComponentProps<typeof Ionicons>['name']

export interface EmptyStateProps {
  icon?: IconName
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}

/** Shared empty/no-results state with an optional recovery action. */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const t = useAppTheme()
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}${message ? `. ${message}` : ''}`}
      style={[styles.wrap, { paddingVertical: compact ? t.spacing.xl : t.spacing.xxxxl }]}
    >
      <View style={[styles.icon, { backgroundColor: t.colors.primarySoft, borderRadius: t.radius.xl }]}>
        <Ionicons name={icon} size={27} color={t.colors.primary} />
      </View>
      <AppText variant="heading" center>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="textMuted" center style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" size="sm" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  icon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  message: { maxWidth: 320 },
  action: { marginTop: 8 },
})
