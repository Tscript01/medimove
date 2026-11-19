import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { useAppTheme, type ThemeColors } from '../../theme'
import { AppText } from './AppText'

export interface AppHeaderProps {
  title: string
  subtitle?: string
  /** Show a back button. Defaults to false for tab roots. */
  showBack?: boolean
  /** Override the default router.back() action. */
  onBack?: () => void
  /** Optional trailing control area, aligned to the right of the title. */
  right?: ReactNode
  /** Use the smaller 20px heading. */
  compact?: boolean
  /** Hide the dividing line below the header. */
  hideDivider?: boolean
}

/** Consistent screen title bar for screens that manage their own header. */
export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  compact = false,
  hideDivider = false,
}: AppHeaderProps) {
  const t = useAppTheme()
  const router = useRouter()
  const fg: keyof ThemeColors = 'text'

  return (
    <View
      style={[
        styles.wrap,
        { borderBottomColor: hideDivider ? 'transparent' : t.colors.border },
      ]}
      accessibilityRole="header"
    >
      {showBack ? (
        <Pressable
          onPress={onBack ?? (() => router.back())}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          android_ripple={{ color: t.colors.primarySoft, borderless: true }}
          style={({ pressed }) => [styles.back, pressed && Platform.OS === 'ios' ? styles.pressed : null]}
        >
          <Ionicons name="chevron-back" size={22} color={t.colors[fg]} />
        </Pressable>
      ) : null}

      <View style={styles.text}>
        <AppText variant={compact ? 'heading' : 'title'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, marginLeft: -8 },
  text: { flex: 1, gap: 1 },
  right: { marginLeft: 'auto' },
  pressed: { opacity: 0.7 },
})
