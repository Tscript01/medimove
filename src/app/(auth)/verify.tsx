import {
  AppHeader,
  AppInput,
  AppText,
  Card,
  CodeInput,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/ui'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'

// Keep in step with the backend's OTP_RESEND_COOLDOWN_SECONDS and OTP_EXPIRY_MINUTES.
const RESEND_SECONDS = 60
const EXPIRY_MINUTES = 5

// The API client should pass these through from the server's JSON error body.
type ApiError = Error & { code?: string; attemptsRemaining?: number; retryAfterSeconds?: number }

export default function VerifyScreen() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { email: emailParam } = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState(emailParam ?? '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(emailParam ? RESEND_SECONDS : 0)
  const hasCooldown = cooldown > 0
  const submitting = useRef(false) // blocks a double submit (auto-submit + button tap)

  // One interval per cooldown window rather than one per countdown tick.
  useEffect(() => {
    if (!hasCooldown) return
    const interval = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(interval)
  }, [hasCooldown])

  const submit = async (value: string) => {
    if (submitting.current) return
    if (!email.trim() || value.length !== 6) {
      setError('Enter the 6-digit code we emailed you.')
      return
    }
    submitting.current = true
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const res = await authService.verifyEmail(email.trim(), value)
      await setAuth(res.user, { accessToken: res.accessToken, refreshToken: res.refreshToken })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace('/(tabs)')
    } catch (err) {
      const e = err as ApiError
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)

      if (e.code === 'TOO_MANY_ATTEMPTS') {
        setCode('')
        setError('Too many incorrect attempts. Please request a new code.')
      } else if (e.code === 'INVALID_CODE') {
        setCode('') // let the person type again straight away
        setError(
          typeof e.attemptsRemaining === 'number'
            ? `That code is incorrect. ${e.attemptsRemaining} ${e.attemptsRemaining === 1 ? 'attempt' : 'attempts'} left.`
            : 'That code is incorrect or has expired. Use the latest email, or request a new code.',
        )
      } else {
        // Network or server problem: keep the typed code so they can simply retry.
        setError(e.message || 'We could not verify the code. Check your connection and try again.')
      }
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  const handleChange = (value: string) => {
    setCode(value)
    if (error) setError(null)
    if (value.length === 6) submit(value) // verify as soon as the sixth digit is entered
  }

  const handleResend = async () => {
    if (!email.trim() || cooldown > 0) return
    setResending(true)
    setError(null)
    setNotice(null)
    try {
      await authService.resendVerification(email.trim())
      setCode('')
      setNotice('A new code is on its way. It may take a minute to arrive.')
      setCooldown(RESEND_SECONDS)
    } catch (err) {
      const e = err as ApiError
      if (e.code === 'OTP_COOLDOWN' && typeof e.retryAfterSeconds === 'number') setCooldown(e.retryAfterSeconds)
      setError(e.message || 'Could not resend the code.')
    } finally {
      setResending(false)
    }
  }

  const shownEmail = email.trim() || emailParam

  return (
    <Screen
      header={
        <AppHeader
          title="Verify email"
          subtitle={
            shownEmail
              ? `Enter the 6-digit code sent to ${shownEmail}. It expires in ${EXPIRY_MINUTES} minutes.`
              : 'Enter the 6-digit code we emailed you.'
          }
          showBack
          onBack={() => router.replace('/(auth)/login')}
          compact
          hideDivider
        />
      }
      contentStyle={styles.content}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Scrolls when the keyboard or a large font size leaves too little room, so nothing is cut off. */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            {!emailParam ? (
              <AppInput
                label="Email address"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}

            <CodeInput
              value={code}
              onChange={handleChange}
              autoFocus={Boolean(emailParam)}
              onSubmitEditing={() => submit(code)}
            />

            {/* Live region: screen readers announce errors and notices as they appear. */}
            <View accessibilityLiveRegion="polite" accessibilityRole="alert">
              {error ? <Notice text={error} tone="danger" /> : null}
              {notice ? <Notice text={notice} tone="success" /> : null}
            </View>

            <PrimaryButton label="Verify & continue" onPress={() => submit(code)} loading={loading} />
          </Card>

          <View style={styles.resendRow}>
            <AppText variant="caption" color="textMuted" style={styles.centerText}>
              Didn&apos;t get a code? Check your spam folder, or request a new one.
            </AppText>
            <SecondaryButton
              label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              size="sm"
              fullWidth={false}
              loading={resending}
              disabled={cooldown > 0 || !email.trim()}
              onPress={handleResend}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { paddingTop: 16 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 24 },
  card: { gap: 16 },
  resendRow: { alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 16 },
  centerText: { textAlign: 'center' },
})