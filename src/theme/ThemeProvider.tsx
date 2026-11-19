import * as SystemUI from 'expo-system-ui'
import { useEffect, type PropsWithChildren } from 'react'
import { Appearance, Platform } from 'react-native'
import { useThemeStore } from '../store/themeStore'
import { useAppTheme } from './useAppTheme'

/**
 * Hydrates the saved appearance preference and keeps native chrome
 * (Android navigation bar / window background) aligned with the active theme.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const hydrate = useThemeStore((state) => state.hydrate)
  const preference = useThemeStore((state) => state.preference)
  const { colors } = useAppTheme()

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Keep native alerts, WebViews and other system-driven surfaces in sync with
  // the user's choice. 'auto' hands control back to the device for System mode.
  useEffect(() => {
    try {
      Appearance.setColorScheme(preference === 'system' ? 'auto' : preference)
    } catch {
      // Some platforms/runtimes do not support an app-level override; the
      // React Native tree still follows the active theme via useAppTheme().
    }
  }, [preference])

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return
    void SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {})
  }, [colors.bg])

  return <>{children}</>
}
