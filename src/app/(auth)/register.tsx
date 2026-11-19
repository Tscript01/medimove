import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useRef, useState, type ComponentRef } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { AppInput, AppText, Button, Notice, Screen } from '@/components/ui'
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll'
import { authService } from '@/services/auth.service'
import { useAppTheme } from '@/theme'

/** Mirror of the backend's password rule so the user gets instant feedback. */
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(pw)) return 'Password must contain at least one letter.'
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number.'
  return null
}

export default function RegisterScreen() {
  const router = useRouter()
  const t = useAppTheme()
  const { scrollRef, onScroll, revealInput } = useKeyboardAwareScroll()

  const nameRef = useRef<ComponentRef<typeof TextInput>>(null)
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null)
  const phoneRef = useRef<ComponentRef<typeof TextInput>>(null)
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null)
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    const nextNameError = fullName.trim() ? null : 'Enter your full name.'
    const nextEmailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? null
      : 'Enter a valid email address.'
    const nextPhoneError = phone.trim() ? null : 'Enter your phone number.'
    const nextPasswordError = validatePassword(password)
    const nextConfirmError = password === confirm ? null : 'Passwords do not match.'

    setNameError(nextNameError)
    setEmailError(nextEmailError)
    setPhoneError(nextPhoneError)
    setPasswordError(nextPasswordError)
    setConfirmError(nextConfirmError)

    if (
      nextNameError ||
      nextEmailError ||
      nextPhoneError ||
      nextPasswordError ||
      nextConfirmError
    ) {
      return
    }

    setLoading(true)
    setFormError(null)
    try {
      await authService.register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace({ pathname: '/(auth)/verify', params: { email: email.trim() } })
    } catch (err) {
      setFormError((err as Error).message || 'Unable to create your account.')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen
      scroll
      avoidKeyboard
      padded={false}
      contentStyle={styles.screen}
      scrollViewRef={scrollRef}
      onScroll={onScroll}
    >
      <View style={styles.hero}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            android_ripple={{ color: t.colors.primarySoft, borderless: true }}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={t.colors.text} />
          </Pressable>
          <View style={styles.brand}>
            <View
              style={[
                styles.brandMark,
                { backgroundColor: t.colors.primary, borderRadius: t.radius.sm },
              ]}
            >
              <Ionicons name="medical" size={16} color={t.colors.onPrimary} />
            </View>
            <AppText variant="subheading">MediMove</AppText>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <AppText variant="display">Create your account</AppText>
          <AppText variant="body" color="textMuted">
            We&apos;ll email you a 6-digit code to verify your address.
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
            paddingBottom: t.spacing.xl,
          },
        ]}
      >
        <View style={styles.fields}>
          <AppInput
            label="Full name"
            icon="person-outline"
            value={fullName}
            onChangeText={(value) => {
              setFullName(value)
              if (nameError) setNameError(null)
            }}
            placeholder="Ada Obi"
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            onFocus={() => revealInput(nameRef)}
            onSubmitEditing={() => emailRef.current?.focus()}
            inputRef={nameRef}
            error={nameError ?? undefined}
          />

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
            onFocus={() => revealInput(emailRef)}
            onSubmitEditing={() => phoneRef.current?.focus()}
            inputRef={emailRef}
            error={emailError ?? undefined}
          />

          <AppInput
            label="Phone number"
            icon="call-outline"
            value={phone}
            onChangeText={(value) => {
              setPhone(value)
              if (phoneError) setPhoneError(null)
            }}
            placeholder="+234 801 234 5678"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            onFocus={() => revealInput(phoneRef)}
            onSubmitEditing={() => passwordRef.current?.focus()}
            inputRef={phoneRef}
            error={phoneError ?? undefined}
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
            placeholder="At least 8 characters"
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onFocus={() => revealInput(passwordRef)}
            onSubmitEditing={() => confirmRef.current?.focus()}
            inputRef={passwordRef}
            helper="Use at least 8 characters with a letter and a number."
            error={passwordError ?? undefined}
          />

          <AppInput
            label="Confirm password"
            icon="lock-closed-outline"
            secure
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value)
              if (confirmError) setConfirmError(null)
            }}
            placeholder="Re-enter your password"
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onFocus={() => revealInput(confirmRef)}
            onSubmitEditing={() => void handleRegister()}
            inputRef={confirmRef}
            error={confirmError ?? undefined}
          />
        </View>

        {formError ? <Notice text={formError} tone="danger" /> : null}

        <Button
          label="Create account"
          onPress={() => void handleRegister()}
          loading={loading}
          iconEnd="arrow-forward"
        />

        <View style={styles.privacy}>
          <Ionicons name="shield-checkmark-outline" size={13} color={t.colors.textFaint} />
          <AppText variant="micro" color="textFaint">
            Your details are used only to coordinate transport and care.
          </AppText>
        </View>

        <View style={styles.footer}>
          <AppText variant="caption" color="textMuted">
            Already have an account?
          </AppText>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="link"
            accessibilityLabel="Sign in"
            hitSlop={8}
            android_ripple={{ color: t.colors.primarySoft, borderless: true }}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <AppText variant="button" color="secondary">
              Sign in
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
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  back: {
    width: 40,
    height: 40,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    gap: 12,
  },
  surface: {
    flexGrow: 1,
    marginTop: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  fields: {
    gap: 20,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footer: {
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
  pressed: {
    opacity: 0.6,
  },
})
