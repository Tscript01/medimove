import type { AuthResponse, User } from '../types'
import { http } from './api'

export interface RegisterInput {
  email: string
  password: string
  fullName: string
  phone: string
}

export interface MessageResponse {
  success: boolean
  message?: string
}

/**
 * Authentication endpoints. Token persistence and rotation are handled by the
 * API client (`api.ts`); these calls only speak HTTP.
 */
export const authService = {
  /** Create an account and trigger the verification OTP. */
  register: (input: RegisterInput) => http.post<MessageResponse>('/auth/register', input),

  /** Verify the emailed OTP and receive the first token pair. */
  verifyEmail: (email: string, code: string) => http.post<AuthResponse>('/auth/verify-email', { email, code }),

  /** Resend the verification OTP. */
  resendVerification: (email: string) => http.post<MessageResponse>('/auth/resend-verification', { email }),

  login: (email: string, password: string) => http.post<AuthResponse>('/auth/login', { email, password }),

  me: () => http.get<{ success: boolean; user: User }>('/auth/me'),

  logout: (refreshToken?: string) =>
    http.post<MessageResponse>('/auth/logout', refreshToken ? { refreshToken } : {}),

  forgotPassword: (email: string) => http.post<MessageResponse>('/auth/password/forgot', { email }),

  resetPassword: (input: { email: string; code: string; newPassword: string }) =>
    http.post<MessageResponse>('/auth/password/reset', input),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    http.post<MessageResponse>('/auth/password/change', input),
}
