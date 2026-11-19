import { useEffect, useMemo } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'

export interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  rounded?: 'sm' | 'md' | 'lg' | 'pill'
}

/** Neutral loading placeholder. Purely visual, so it is hidden from a11y. */
export function Skeleton({ width = '100%', height = 12, rounded = 'sm' }: SkeletonProps) {
  const t = useAppTheme()
  const opacity = useMemo(() => new Animated.Value(0.45), [])

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      accessible={false}
      style={[
        styles.block,
        {
          width,
          height,
          backgroundColor: t.colors.surfaceAlt,
          borderRadius: rounded === 'pill' ? 999 : t.radius[rounded],
        },
        { opacity },
      ]}
    />
  )
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? '60%' : '100%'} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { maxWidth: '100%' },
  card: { gap: 10, padding: 16, borderWidth: 1, borderColor: 'transparent', borderRadius: 14 },
})
