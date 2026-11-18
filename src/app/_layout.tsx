import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="booking/active"
          options={{
            headerShown: true,
            title: 'Live Dispatch',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#0F172A',
          }}
        />
        <Stack.Screen
          name="payment/webpay"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Interswitch WebPay',
            headerStyle: { backgroundColor: '#1E293B' },
            headerTintColor: '#FFFFFF',
          }}
        />
      </Stack>
    </>
  )
}