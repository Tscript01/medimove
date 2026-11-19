import { Redirect } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { BrandMark } from '../components/BrandMark'
import { AppText, Screen } from '../components/ui'
import { useAuthStore } from '../store/authStore'
import { useAppTheme } from '../theme'

/**
 * Entry gate. Restores the session from stored tokens (validating via
 * `/auth/me`) before deciding where to send the user.
 */
export default function RootIndex() {
  const status = useAuthStore((state) => state.status)
  const bootstrap = useAuthStore((state) => state.bootstrap)
  const t = useAppTheme()

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  if (status === 'loading') {
    return (
      <Screen>
        <View style={styles.center}>
          <BrandMark compact />
          <ActivityIndicator size="small" color={t.colors.secondary} />
          <AppText variant="caption" color="textMuted">
            Restoring your session…
          </AppText>
        </View>
      </Screen>
    )
  }

  if (status === 'authenticated') return <Redirect href="/(tabs)" />

  return <Redirect href="/(auth)/welcome" />
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
})
