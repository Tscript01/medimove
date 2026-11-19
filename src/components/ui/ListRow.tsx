import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useAppTheme } from '../../theme'
import { AppText } from './AppText'

type IconName = ComponentProps<typeof Ionicons>['name']

export interface ListRowProps {
  icon?: IconName
  title: string
  value?: string
  detail?: string
  right?: ReactNode
  onPress?: () => void
  last?: boolean
  destructive?: boolean
  accessibilityLabel?: string
}

/** A compact settings/detail row that works inside a Card or on its own. */
export function ListRow({
  icon,
  title,
  value,
  detail,
  right,
  onPress,
  last = false,
  destructive = false,
  accessibilityLabel,
}: ListRowProps) {
  const t = useAppTheme()
  const content = (
    <>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: t.colors.primarySoft }]}>
          <Ionicons name={icon} size={18} color={t.colors.primary} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <AppText variant="bodyStrong" color={destructive ? 'emergency' : 'text'} numberOfLines={1}>
          {title}
        </AppText>
        {detail ? (
          <AppText variant="caption" color="textMuted" numberOfLines={2}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} /> : null}
    </>
  )

  const rowStyle = [
    styles.row,
    { borderBottomColor: t.colors.border, paddingHorizontal: t.spacing.lg },
    last && styles.last,
  ]

  if (!onPress) {
    return (
      <View style={rowStyle} accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? title}>
        {content}
      </View>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      android_ripple={{ color: t.colors.primarySoft }}
      style={({ pressed }) => [rowStyle, pressed && Platform.OS === 'ios' && styles.pressed]}
    >
      {content}
    </Pressable>
  )
}

/** A themed group container for consecutive ListRow instances. */
export interface ListGroupProps {
  style?: StyleProp<ViewStyle>
}

export function ListGroup({ children, style }: PropsWithChildren<ListGroupProps>) {
  const t = useAppTheme()
  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderRadius: t.radius.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, overflow: 'hidden' },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  last: { borderBottomWidth: 0 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 1 },
  value: { maxWidth: '45%', textAlign: 'right' },
  pressed: { opacity: 0.6 },
})
