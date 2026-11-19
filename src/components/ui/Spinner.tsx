import { ActivityIndicator, StyleSheet } from 'react-native'
import { useAppTheme } from '../../theme'

export interface SpinnerProps {
  size?: 'small' | 'large' | number
  color?: string
}

export function Spinner({ size = 'small', color }: SpinnerProps) {
  const t = useAppTheme()
  return <ActivityIndicator size={size} color={color ?? t.colors.primary} style={styles.spin} />
}

const styles = StyleSheet.create({
  spin: { marginRight: 2 },
})
