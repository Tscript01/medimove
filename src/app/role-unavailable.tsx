import { Ionicons } from '@expo/vector-icons'
import { Alert } from 'react-native'
import { AppText, Badge, Button, Card, Screen } from '@/components/ui'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { useAuthStore } from '@/store/authStore'
import { useAppTheme } from '@/theme'
import { SIGN_IN } from '@/utils/roleRouting'
import { titleCase } from '@/utils/format'

/**
 * The mobile app intentionally ships only the PATIENT and CREW experiences.
 * Operational roles belong in their desktop PWA consoles; this screen says so
 * plainly instead of dropping them into the requester UI with the wrong scope.
 */
export default function RoleUnavailableScreen() {
  const t = useAppTheme()
  const navigation = useSafeNavigation()
  const role = useAuthStore((state) => state.user?.role)
  const email = useAuthStore((state) => state.user?.email)
  const logout = useAuthStore((state) => state.logout)

  const signOut = () => {
    Alert.alert('Sign out?', 'You can sign in with a patient or crew account on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          navigation.replace(SIGN_IN)
        },
      },
    ])
  }

  return (
    <Screen contentStyle={{ gap: 16 }}>
      <Card>
        <Ionicons name="desktop-outline" size={38} color={t.colors.primary} />
        <AppText variant="title" style={{ marginTop: 14 }}>
          Use the web console
        </AppText>
        <AppText variant="body" color="textMuted" style={{ marginTop: 8 }}>
          This app is for patients requesting transport and crew working trips. Your account is for
          operations administration, which runs in the web console.
        </AppText>
        <Badge label={role ? titleCase(role) : 'Unknown role'} tone="info" icon="shield-outline" />
        {email ? (
          <AppText variant="caption" color="textFaint" style={{ marginTop: 10 }}>
            Signed in as {email}
          </AppText>
        ) : null}
      </Card>
      <Button label="Sign out" variant="secondary" onPress={signOut} />
    </Screen>
  )
}
