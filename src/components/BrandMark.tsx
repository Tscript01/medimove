import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { useAppTheme } from '../theme'
import { AppText } from './ui'

/** The MediMove brand lockup used on the auth screens. */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  const t = useAppTheme()
  return (
    <View style={styles.wrap}>
      <View style={[styles.mark, { backgroundColor: t.colors.primary, borderRadius: t.radius.xl }]}>
        <Ionicons name="medical" size={compact ? 26 : 34} color={t.colors.onPrimary} />
      </View>
      <View style={styles.text}>
        <AppText variant={compact ? 'heading' : 'title'} center>
          MediMove
        </AppText>
        <AppText variant="caption" color="textMuted" center>
          Emergency dispatch &amp; health reserve
        </AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14 },
  mark: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  text: { gap: 2 },
})
