import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'
import type { ThemeColors } from '../../theme/tokens'
import { AppText } from './AppText'

type IconName = React.ComponentProps<typeof Ionicons>['name']

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

const TONES: Record<BadgeTone, { fg: keyof ThemeColors; bg: keyof ThemeColors }> = {
  neutral: { fg: 'textMuted', bg: 'surfaceAlt' },
  primary: { fg: 'onPrimarySoft', bg: 'primarySoft' },
  success: { fg: 'onSuccessSoft', bg: 'successSoft' },
  warning: { fg: 'onWarningSoft', bg: 'warningSoft' },
  danger: { fg: 'onEmergencySoft', bg: 'emergencySoft' },
  info: { fg: 'onInfoSoft', bg: 'infoSoft' },
}

export interface BadgeProps {
  label: string
  tone?: BadgeTone
  icon?: IconName
}

/** A compact status/label chip. */
export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const t = useAppTheme()
  const { fg, bg } = TONES[tone]
  return (
    <View style={[styles.badge, { backgroundColor: t.colors[bg], borderRadius: t.radius.pill }]}>
      {icon ? <Ionicons name={icon} size={12} color={t.colors[fg]} /> : null}
      <AppText variant="micro" color={fg} numberOfLines={1}>
        {label.toUpperCase()}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
})
