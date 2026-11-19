import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'

export interface ProgressBarProps {
  /** 0–1. Values outside the range are clamped. */
  value: number
  tone?: 'primary' | 'success' | 'warning' | 'emergency'
  height?: number
}

export function ProgressBar({ value, tone = 'primary', height = 6 }: ProgressBarProps) {
  const t = useAppTheme()
  const colors = {
    primary: t.colors.primary,
    success: t.colors.success,
    warning: t.colors.warning,
    emergency: t.colors.emergency,
  }
  const clamped = Math.min(1, Math.max(0, value))

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: t.colors.surfaceAlt, borderRadius: height / 2 }]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height,
          backgroundColor: colors[tone],
          borderRadius: height / 2,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
})
