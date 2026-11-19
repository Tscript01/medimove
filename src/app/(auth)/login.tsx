import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppInput, AppText, Button, Notice, Screen } from '@/components/ui'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import { useAppTheme } from '@/theme'

export default function LoginScreen() {
  const router = useRouter()
  const t = useAppTheme()
  const insets = useSafeAreaInsets()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    const nextEmailError = email.trim() ? null : 'Enter your email address.'
    const nextPasswordError = password ? null : 'Enter your password.'
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    if (nextEmailError || nextPasswordError) return

    setLoading(true)
    setFormError(null)
    try {
      const res = await authService.login(email.trim(), password)
      await setAuth(res.user, { accessToken: res.accessToken, refreshToken: res.refreshToken })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)')
    } catch (err) {
      setFormError((err as Error).message || 'Unable to sign in. Check your details and try again.')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen scroll avoidKeyboard contentStyle={styles.screen}>
      <View style={[styles.hero, { paddingTop: insets.top + 32 }]}>
        <View style={styles.brandRow}>
          <View
            style={[
              styles.brandMark,
              { backgroundColor: t.colors.primary, borderRadius: t.radius.sm },
            ]}
          >
            <Ionicons name="medical" size={22} color={t.colors.onPrimary} />
          </View>
          <AppText variant="title">MediMove</AppText>
        </View>

        <View style={styles.heroCopy}>
          <AppText variant="display">Welcome back</AppText>
          <AppText variant="body" color="textMuted">
            Sign in to request an ambulance and manage your health reserve.
          </AppText>
        </View>
      </View>

      <View
        style={[
          styles.surface,
          {
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.lg,
            borderTopRightRadius: t.radius.lg,
            paddingBottom: insets.bottom + t.spacing.xl,
          },
        ]}
      >
        <View style={styles.fields}>
          <AppInput
            label="Email address"
            icon="mail-outline"
            value={email}
            onChangeText={(value) => {
              setEmail(value)
              if (emailError) setEmailError(null)
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            error={emailError ?? undefined}
          />

          <AppInput
            label="Password"
            icon="lock-closed-outline"
            secure
            value={password}
            onChangeText={(value) => {
              setPassword(value)
              if (passwordError) setPasswordError(null)
            }}
            placeholder="Enter your password"
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void handleLogin()}
            error={passwordError ?? undefined}
          />
        </View>

        {formError ? <Notice text={formError} tone="danger" /> : null}

        <Button
          label="Sign in"
          onPress={() => void handleLogin()}
          loading={loading}
          iconEnd="arrow-forward"
        />

        <View style={styles.security}>
          <Ionicons name="lock-closed-outline" size={13} color={t.colors.textFaint} />
          <AppText variant="micro" color="textFaint">
            Your session is stored securely on this device.
          </AppText>
        </View>

        <View style={styles.createAccount}>
          <AppText variant="caption" color="textMuted">
            New to MediMove?
          </AppText>
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            accessibilityRole="link"
            accessibilityLabel="Create an account"
            hitSlop={8}
            android_ripple={{ color: t.colors.primarySoft, borderless: true }}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
          >
            <AppText variant="button" color="secondary">
              Create account
            </AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  hero: {
    paddingHorizontal: 20,
    gap: 32,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    gap: 12,
  },
  surface: {
    flex: 1,
    marginTop: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  fields: {
    gap: 20,
  },
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  createAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 24,
  },
  link: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  linkPressed: {
    opacity: 0.6,
  },
})
