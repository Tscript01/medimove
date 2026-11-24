import Constants from 'expo-constants'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Alert, RefreshControl, StyleSheet, Switch, View } from 'react-native'
import {
  AppText,
  Avatar,
  Badge,
  Card,
  ListRow,
  Notice,
  Screen,
  SecondaryButton,
  SectionHeader,
} from '@/components/ui'
import { useSafeNavigation } from '@/hooks/useSafeNavigation'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { useAppTheme } from '@/theme'
import { titleCase } from '@/utils/format'

export default function ProfileScreen() {
  const t = useAppTheme()
  const navigation = useSafeNavigation()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const logout = useAuthStore((state) => state.logout)

  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [shareLocation, setShareLocation] = useState(true)

  const toggle = (set: (value: boolean) => void) => (value: boolean) => {
    Haptics.selectionAsync().catch(() => {})
    set(value)
  }

  const refreshProfile = async () => {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const { user: fresh } = await authService.me()
      updateUser(fresh)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      setRefreshError((err as Error).message || 'Could not refresh your profile.')
    } finally {
      setRefreshing(false)
    }
  }

  const comingSoon = (what: string) => () => Alert.alert(what, 'This screen is not built yet.')

  const signOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
    Alert.alert('Sign out?', 'You will need to sign in again to book an ambulance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          navigation.replace('/(auth)/login')
        },
      },
    ])
  }

  const switchProps = {
    trackColor: { false: t.colors.borderStrong, true: t.colors.primary },
    ios_backgroundColor: t.colors.borderStrong,
  }

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshProfile} tintColor={t.colors.primary} />
      }
    >
      <View style={styles.headerRow}>
        <AppText variant="display">Profile</AppText>
        <SecondaryButton
          label="Refresh"
          icon="refresh-outline"
          size="sm"
          fullWidth={false}
          loading={refreshing}
          onPress={() => void refreshProfile()}
        />
      </View>
      <AppText variant="body" color="textMuted" style={styles.subtitle}>
        Your account and emergency details.
      </AppText>

      {refreshError ? <Notice text={refreshError} tone="danger" /> : null}

      <Card style={styles.identity}>
        <Avatar name={user?.fullName ?? 'Guest'} size={62} />
        <View style={styles.identityText}>
          <AppText variant="heading" numberOfLines={2}>
            {user?.fullName ?? 'Guest'}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {user?.email ?? ''}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {user?.phone ?? ''}
          </AppText>
        </View>
        {user?.role ? <Badge label={titleCase(user.role)} tone="primary" /> : null}
      </Card>

      {user && !user.emailVerified ? (
        <View style={styles.verifyNote}>
          <Notice text="Verify your email to keep your account secure." tone="warning" />
        </View>
      ) : null}

      <SectionHeader title="Medical ID" subtitle="Information responders see first" />
      <Card style={styles.cardGap}>
        <Notice text="No medical details have been added yet. This section will unlock when medical profiles are available." tone="info" />
        <ListRow icon="medkit-outline" title="Edit medical details" onPress={comingSoon('Medical details')} last />
      </Card>

      <SectionHeader title="Emergency contacts" subtitle="People we can reach on your behalf" />
      <Card style={styles.cardGap} padded={false}>
        <View style={styles.noticePad}>
          <Notice text="No emergency contacts are saved yet." tone="info" />
        </View>
        <ListRow icon="person-add-outline" title="Add a contact" onPress={comingSoon('Add contact')} last />
      </Card>

      <SectionHeader title="Preferences" />
      <Card padded={false}>
        <ListRow
          icon="notifications-outline"
          title="Notifications"
          right={<Switch {...switchProps} value={notifications} onValueChange={toggle(setNotifications)} accessibilityLabel="Notifications" />}
        />
        <ListRow
          icon="locate-outline"
          title="Share location with responders"
          right={
            <Switch
              {...switchProps}
              value={shareLocation}
              onValueChange={toggle(setShareLocation)}
              accessibilityLabel="Share location with responders"
            />
          }
        />
        <ListRow icon="language-outline" title="Language" value="English" onPress={comingSoon('Language')} last />
      </Card>

      <SectionHeader title="Support" />
      <Card padded={false}>
        <ListRow icon="help-circle-outline" title="Help & support" onPress={comingSoon('Help & support')} />
        <ListRow icon="flash-outline" title="API diagnostics" onPress={() => navigation.navigate('/test-api')} />
        <ListRow icon="lock-closed-outline" title="Privacy & terms" onPress={comingSoon('Privacy & terms')} last />
      </Card>

      <View style={styles.signOut}>
        <SecondaryButton label="Sign out" icon="log-out-outline" onPress={signOut} />
        <AppText variant="caption" color="textFaint">
          Version {Constants.expoConfig?.version ?? '1.0.0'}
        </AppText>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  subtitle: { marginTop: 4, marginBottom: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityText: { flex: 1, gap: 2 },
  verifyNote: { marginTop: 12 },
  cardGap: { gap: 12 },
  noticePad: { padding: 16 },
  signOut: { gap: 10, marginTop: 32, marginBottom: 8 },
})
