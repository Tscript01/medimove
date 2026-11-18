import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => Promise<void>
  updateUser: (user: User) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('userToken', token)
    set({ user, token })
  },

  updateUser: (user) => {
    set({ user })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken')
    set({ user: null, token: null })
  },
}))