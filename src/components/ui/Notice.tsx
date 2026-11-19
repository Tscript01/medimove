import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'
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
}

/** Compact inline feedback that does not interrupt the current task. */
export function Notice({ text, tone = 'info' }: NoticeProps) {
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
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12 },
  text: { flex: 1 },
})
