import * as SecureStore from 'expo-secure-store'

/**
 * Persistence for the user's appearance preference.
 *
 * Uses the same SecureStore-backed approach as tokenStorage so the preference
 * survives restarts and is available before the first meaningful paint.
 */

const THEME_PREFERENCE_KEY = 'medimove.themePreference'

export type ThemePreference = 'light' | 'dark' | 'system'

const VALID: readonly ThemePreference[] = ['light', 'dark', 'system']

export async function getThemePreference(): Promise<ThemePreference | null> {
  try {
    const value = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY)
    return VALID.find((item) => item === value) ?? null
  } catch {
    // SecureStore can be unavailable in a browser/private context. Fall back
    // to following the system rather than breaking the whole app.
    return null
  }
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference)
  } catch {
    // Preference still applies for this session; it simply won't persist.
  }
}
