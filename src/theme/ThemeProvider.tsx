import * as SystemUI from 'expo-system-ui'
import { useEffect, type PropsWithChildren } from 'react'
import { Appearance, Platform } from 'react-native'
import { lightColors } from './tokens'

/**
 * Keeps native chrome (alerts, WebViews, Android navigation bar) on the single
 * light palette. The product no longer offers an appearance preference.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    try {
      Appearance.setColorScheme('light')
    } catch {
      // Some platforms/runtimes do not support an app-level override.
    }

    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return
    void SystemUI.setBackgroundColorAsync(lightColors.bg).catch(() => {})
  }, [])

  return <>{children}</>
}
