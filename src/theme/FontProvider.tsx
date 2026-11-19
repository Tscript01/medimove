import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, type PropsWithChildren } from 'react'
import manropeVariable from '@/assets/fonts/Manrope-Variable.ttf'
import { FONT_FAMILY } from './tokens'

// Keep the native splash visible until the font is ready so text never
// flashes in the system font before Manrope loads.
SplashScreen.preventAutoHideAsync()

/**
 * Loads the single variable Manrope file used throughout the app.
 *
 * A variable font is deliberate: the type scale needs a 650 card-heading
 * weight, which static font cuts cannot provide. Leaving the weight range open
 * lets React Native render every declared weight from the same asset.
 */
export function FontProvider({ children }: PropsWithChildren) {
  const [loaded, error] = useFonts([
    {
      fontFamily: FONT_FAMILY,
      fontDefinitions: [{ path: manropeVariable, weight: '200 800' }],
    },
  ])

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync()
    }
  }, [loaded, error])

  // If loading fails, still render the app so the system-font fallback works.
  if (!loaded && !error) return null

  return <>{children}</>
}
