import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppBootstrap } from '../components/AppBootstrap'
import { FONT_FAMILY, ThemeProvider, useAppTheme } from '../theme'

export default function RootLayout() {
  const t = useAppTheme()

  const headerOptions = {
    headerStyle: { backgroundColor: t.colors.bgElevated },
    headerTintColor: t.colors.text,
    headerTitleStyle: { color: t.colors.text, fontFamily: FONT_FAMILY, fontWeight: t.typography.heading.fontWeight },
    headerShadowVisible: false,
  }

  return (
    <AppBootstrap>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: t.colors.bg },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(crew)" />
            <Stack.Screen
              name="role-unavailable"
              options={{ ...headerOptions, headerShown: true, title: 'Role not supported here' }}
            />
            <Stack.Screen
              name="booking/[id]"
              options={{ ...headerOptions, headerShown: true, title: 'Live tracking', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="booking/checkout"
              options={{ ...headerOptions, headerShown: true, title: 'Checkout', presentation: 'modal' }}
            />
            <Stack.Screen
              name="location-picker"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="request/[mode]"
              options={{ ...headerOptions, headerShown: true, title: 'Request transport', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="journey/setup"
              options={{ ...headerOptions, headerShown: true, title: 'Track My Journey', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="journey/live"
              options={{ ...headerOptions, headerShown: true, title: 'Journey tracking', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="test-api"
              options={{ ...headerOptions, headerShown: true, title: 'Diagnostics' }}
            />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    </AppBootstrap>
  )
}
