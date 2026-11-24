import { useRouter, type ImperativeRouter } from 'expo-router'
import { useMemo } from 'react'

type Href = Parameters<ImperativeRouter['navigate']>[0]
type NavigationOptions = Parameters<ImperativeRouter['navigate']>[1]
type TransitionOptions = Parameters<ImperativeRouter['back']>[0]

/**
 * Rapid double-taps can fire the same onPress twice before the modal unmounts.
 * Serialising navigation here keeps a second tap from pushing the same screen
 * again and duplicating the back stack.
 */
const NAVIGATION_GUARD_MS = 800
let lastNavigationAt = 0

function claimNavigation(): boolean {
  const now = Date.now()
  if (now - lastNavigationAt < NAVIGATION_GUARD_MS) return false
  lastNavigationAt = now
  return true
}

/** Use instead of `useRouter()` for imperative navigation from press handlers. */
export function useSafeNavigation() {
  const router = useRouter()

  return useMemo(
    () => ({
      navigate: (href: Href, options?: NavigationOptions) => {
        if (claimNavigation()) router.navigate(href, options)
      },
      replace: (href: Href, options?: NavigationOptions) => {
        if (claimNavigation()) router.replace(href, options)
      },
      back: (options?: TransitionOptions) => {
        if (claimNavigation()) router.back(options)
      },
    }),
    [router]
  )
}
