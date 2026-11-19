import { create } from 'zustand'
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '../services/themeStorage'

export type { ThemePreference } from '../services/themeStorage'

interface ThemeState {
  /** 'system' follows the device appearance setting. */
  preference: ThemePreference
  hydrated: boolean
  setPreference: (preference: ThemePreference) => Promise<void>
  hydrate: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  hydrated: false,

  setPreference: async (preference) => {
    // Apply immediately so the UI responds even if storage is unavailable.
    set({ preference })
    await setThemePreference(preference)
  },

  hydrate: async () => {
    const stored = await getThemePreference()
    set({ preference: stored ?? 'system', hydrated: true })
  },
}))
