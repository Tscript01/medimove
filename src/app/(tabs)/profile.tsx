import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, Switch, View } from 'react-native'
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
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore, type ThemePreference } from '@/store/themeStore'
import { useAppTheme } from '@/theme'
import { titleCase } from '@/utils/format'

const THEME_OPTIONS: readonly SegmentedOption<ThemePreference>[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
]

export default function ProfileScreen() {
  const t = useAppTheme()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const themePreference = useThemeStore((state) => state.preference)
  const setThemePreference = useThemeStore((state) => state.setPreference)

  const [notifications, setNotifications] = useState(true)
  const [shareLocation, setShareLocation] = useState(true)

  const toggle = (set: (value: boolean) => void) => (value: boolean) => {
    Haptics.selectionAsync().catch(() => {})
    set(value)
  }

  const comingSoon = (what: string) => () => Alert.alert(what, 'This screen is not built yet.')

  const selectTheme = (preference: ThemePreference) => {
    if (preference === themePreference) return
    Haptics.selectionAsync().catch(() => {})
    void setThemePreference(preference)
  }

  const signOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
    Alert.alert('Sign out?', 'You will need to sign in again to book an ambulance.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const switchProps = {
    trackColor: { false: t.colors.borderStrong, true: t.colors.primary },
    ios_backgroundColor: t.colors.borderStrong,
  }

  return (
    <Screen>
      <AppText variant="display">Profile</AppText>
      <AppText variant="body" color="textMuted" style={styles.subtitle}>
        Your account and emergency details.
      </AppText>

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
        <View
          style={[
            styles.appearance,
            {
              borderBottomColor: t.colors.border,
              paddingHorizontal: t.spacing.lg,
            },
          ]}
        >
          <View style={styles.appearanceHeader}>
            <View style={[styles.appearanceIcon, { backgroundColor: t.colors.primarySoft }]}>
              <Ionicons name="color-palette-outline" size={18} color={t.colors.primary} />
            </View>
            <View style={styles.appearanceCopy}>
              <AppText variant="bodyStrong">Appearance</AppText>
              <AppText variant="caption" color="textMuted">
                System follows your device setting.
              </AppText>
            </View>
          </View>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={themePreference}
            onChange={selectTheme}
            accessibilityLabel="Appearance"
          />
        </View>
        <ListRow icon="language-outline" title="Language" value="English" onPress={comingSoon('Language')} last />
      </Card>

      <SectionHeader title="Support" />
      <Card padded={false}>
        <ListRow icon="help-circle-outline" title="Help & support" onPress={comingSoon('Help & support')} />
        <ListRow icon="flash-outline" title="API diagnostics" onPress={() => router.push('/test-api')} />
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
  subtitle: { marginTop: 4, marginBottom: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityText: { flex: 1, gap: 2 },
  verifyNote: { marginTop: 12 },
  cardGap: { gap: 12 },
  noticePad: { padding: 16 },
  appearance: {
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appearanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appearanceIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceCopy: { flex: 1, gap: 1 },
  signOut: { gap: 10, marginTop: 32, marginBottom: 8 },
})
