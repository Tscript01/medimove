import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FONT_FAMILY, FontProvider, ThemeProvider, useAppTheme } from '../theme'

export default function RootLayout() {
  const t = useAppTheme()

  const headerOptions = {
    headerStyle: { backgroundColor: t.colors.bgElevated },
    headerTintColor: t.colors.text,
    headerTitleStyle: { color: t.colors.text, fontFamily: FONT_FAMILY, fontWeight: t.typography.heading.fontWeight },
    headerShadowVisible: false,
  }

  return (
    <FontProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: t.colors.bg },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
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
              name="test-api"
              options={{ ...headerOptions, headerShown: true, title: 'Diagnostics' }}
            />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    </FontProvider>
  )
}
