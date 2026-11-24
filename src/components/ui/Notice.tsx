import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useAppTheme, type ThemeColors } from '../../theme'
import { AppText } from './AppText'

type IconName = ComponentProps<typeof Ionicons>['name']

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger'

const TONES: Record<NoticeTone, { icon: IconName; bg: keyof ThemeColors; fg: keyof ThemeColors }> = {
  info: { icon: 'information-circle-outline', bg: 'infoSoft', fg: 'onInfoSoft' },
  success: { icon: 'checkmark-circle-outline', bg: 'successSoft', fg: 'onSuccessSoft' },
  warning: { icon: 'warning-outline', bg: 'warningSoft', fg: 'onWarningSoft' },
  danger: { icon: 'alert-circle-outline', bg: 'emergencySoft', fg: 'onEmergencySoft' },
}

export interface NoticeProps {
  text: string
  tone?: NoticeTone
  /** Optional single recovery action, such as opening manual entry. */
  actionLabel?: string
  onAction?: () => void
}

/** Compact inline feedback that does not interrupt the current task. */
export function Notice({ text, tone = 'info', actionLabel, onAction }: NoticeProps) {
  const t = useAppTheme()
  const config = TONES[tone]

  return (
    <View
      style={[styles.wrap, { backgroundColor: t.colors[config.bg], borderRadius: t.radius.md }]}
      accessibilityRole="alert"
      accessibilityLabel={text}
    >
      <Ionicons name={config.icon} size={18} color={t.colors[config.fg]} />
      <AppText variant="caption" color={config.fg} style={styles.text}>
        {text}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.action}
        >
          <AppText variant="label" color={config.fg}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12 },
  text: { flex: 1 },
  action: { minHeight: 44, justifyContent: 'center' },
})
