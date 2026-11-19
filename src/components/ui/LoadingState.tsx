import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../../theme'
import { AppText } from './AppText'
import { SkeletonCard } from './Skeleton'

export interface LoadingStateProps {
  message?: string
  lines?: number
  compact?: boolean
}

/** Shared first-load state. Keeps skeletons and their caption in one place. */
export function LoadingState({ message = 'Loading…', lines = 3, compact = false }: LoadingStateProps) {
  const t = useAppTheme()
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={[styles.wrap, { gap: compact ? t.spacing.sm : t.spacing.md, marginTop: compact ? 0 : t.spacing.xl }]}
    >
      {!compact ? (
        <AppText variant="caption" color="textMuted">
          {message}
        </AppText>
      ) : null}
      <SkeletonCard lines={lines} />
      {!compact && lines > 2 ? <SkeletonCard lines={2} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
})
