import type { PropsWithChildren } from 'react'
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useAppTheme, type Elevation } from '../../theme'

export interface CardProps {
  elevation?: Elevation
  onPress?: () => void
  onLongPress?: () => void
  borderColor?: 'border' | 'borderStrong' | 'primary' | 'transparent'
  background?: 'surface' | 'surfaceAlt' | 'bgElevated' | 'primarySoft'
  padded?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

/** A rounded themed surface. All grouped content should use this. */
export function Card({
  children,
  elevation = 'sm',
  onPress,
  onLongPress,
  borderColor = 'border',
  background = 'surface',
  padded = true,
  style,
  accessibilityLabel,
}: PropsWithChildren<CardProps>) {
  const t = useAppTheme()
  const base: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: t.colors[background],
      borderColor: borderColor === 'transparent' ? 'transparent' : t.colors[borderColor],
      borderRadius: t.radius.lg,
      padding: padded ? t.spacing.lg : 0,
      ...t.elevation(elevation),
    },
  ]

  const content = <View style={styles.content}>{children}</View>
  const flattened = StyleSheet.flatten([base, style])

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{ color: t.colors.primarySoft }}
        style={({ pressed }) => [flattened, pressed && Platform.OS === 'ios' && styles.pressed]}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View style={flattened} accessibilityRole={accessibilityLabel ? 'group' : undefined} accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  content: { flex: 1 },
  pressed: { opacity: 0.7 },
})
