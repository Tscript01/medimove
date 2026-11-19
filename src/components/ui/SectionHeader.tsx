import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'
import { AppText } from './AppText'

type IconName = ComponentProps<typeof Ionicons>['name']

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  icon?: IconName
}

/** A consistent label for a group of related content. */
export function SectionHeader({ title, subtitle, actionLabel, onAction, icon }: SectionHeaderProps) {
  const t = useAppTheme()
  return (
    <View style={styles.wrap}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          {icon ? <Ionicons name={icon} size={17} color={t.colors.primary} /> : null}
          <AppText variant="heading">{title}</AppText>
        </View>
        {subtitle ? (
          <AppText variant="caption" color="textMuted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          android_ripple={{ color: t.colors.primarySoft, borderless: true }}
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
        >
          <AppText variant="caption" color="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  action: { paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8 },
  pressed: { opacity: 0.6 },
})
