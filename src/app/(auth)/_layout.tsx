import { Stack } from 'expo-router'
import { useAppTheme } from '../../theme'

export default function AuthLayout() {
  const t = useAppTheme()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.colors.bg },
        animation: 'slide_from_right',
      }}
    />
  )
}
