import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, type PropsWithChildren } from 'react'
import manropeVariable from '@/assets/fonts/Manrope-Variable.ttf'
import { useAuthStore } from '../store/authStore'
import { FONT_FAMILY } from '../theme'

// Must run at module scope: calling this inside a component can be too late
// because the native splash may already have been dismissed.
SplashScreen.preventAutoHideAsync()

/**
 * Keeps the native splash visible until the persisted auth session is ready
 * and Manrope has loaded, so text never flashes in the system font.
 */
export function AppBootstrap({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status)
  const bootstrap = useAuthStore((state) => state.bootstrap)
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: FONT_FAMILY,
      fontDefinitions: [{ path: manropeVariable, weight: '200 800' }],
    },
  ])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const ready = status !== 'loading' && (fontsLoaded || Boolean(fontError))

  useEffect(() => {
    if (ready) SplashScreen.hide()
  }, [ready])

  if (!ready) return null

  return <>{children}</>
}
