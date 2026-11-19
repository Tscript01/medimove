import { create } from 'zustand'
import { authService } from '../services/auth.service'
import { onAuthExpired } from '../services/authEvents'
import { clearTokens, getRefreshToken, getTokens, setTokens } from '../services/tokenStorage'
import type { User } from '../types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface AuthState {
  user: User | null
  status: AuthStatus
  /** Persist the session after login / email verification. */
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>
  /** Update the cached user without touching tokens (e.g. after a profile edit). */
  updateUser: (user: User) => void
  /** Restore a session on app start from the stored tokens (validates via /auth/me). */
  bootstrap: () => Promise<void>
  /** Revoke the session server-side (best effort) and clear it locally. */
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  setAuth: async (user, tokens) => {
    await setTokens(tokens)
    set({ user, status: 'authenticated' })
  },

  updateUser: (user) => set({ user }),

  bootstrap: async () => {
    const { accessToken } = await getTokens()
    if (!accessToken) {
      set({ user: null, status: 'unauthenticated' })
      return
    }

    try {
      // The API interceptor transparently refreshes an expired access token.
      const { user } = await authService.me()
      set({ user, status: 'authenticated' })
    } catch {
      await clearTokens()
      set({ user: null, status: 'unauthenticated' })
    }
  },

  logout: async () => {
    const refreshToken = await getRefreshToken()
    try {
      await authService.logout(refreshToken ?? undefined)
    } catch {
      // Best effort: the local session is cleared regardless.
    }
    await clearTokens()
    set({ user: null, status: 'unauthenticated' })
  },
}))

// The API layer emits this when a refresh token is rejected or revoked, so the
// app drops the session and the navigation guards return the user to login.
onAuthExpired(() => {
  useAuthStore.setState({ user: null, status: 'unauthenticated' })
})
