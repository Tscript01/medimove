import { Redirect, Stack } from 'expo-router'
import { RoleGate } from '@/components/RoleGate'
import { useAuthStore } from '@/store/authStore'
import { FONT_FAMILY, useAppTheme } from '@/theme'

/**
 * Crew has its own navigator. It deliberately does not reuse the requester tabs:
 * Wallet, Vault and Track My Journey are patient-only concepts.
 */
export default function CrewLayout() {
  const t = useAppTheme()
  const status = useAuthStore((state) => state.status)

  if (status === 'unauthenticated') return <Redirect href="/(auth)/login" />

  const headerOptions = {
    headerStyle: { backgroundColor: t.colors.bgElevated },
    headerTintColor: t.colors.text,
    headerTitleStyle: {
      color: t.colors.text,
      fontFamily: FONT_FAMILY,
      fontWeight: t.typography.heading.fontWeight,
    },
    headerShadowVisible: false,
  }

  return (
    <RoleGate allow={['CREW']}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.bg },
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen
          name="offer/[id]"
          options={{ ...headerOptions, headerShown: true, title: 'Dispatch offer', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="trip/[id]"
          options={{ ...headerOptions, headerShown: true, title: 'Active trip', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="profile"
          options={{ ...headerOptions, headerShown: true, title: 'Crew profile', headerBackTitle: 'Back' }}
        />
      </Stack>
    </RoleGate>
  )
}
