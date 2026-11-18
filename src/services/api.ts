import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// Grab the live Render backend URL from .env
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://medimove-backend.onrender.com/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15s timeout
})

/**
 * Request Interceptor: Automatically attach stored Bearer JWT token
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken')
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('Failed to retrieve auth token from SecureStore:', error)
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Response Interceptor: Unwrap payload & handle global network/auth errors
 */
api.interceptors.response.use(
  (response) => {
    // Returns data payload directly (e.g. response.data)
    return response.data
  },
  async (error) => {
    if (error.response) {
      // Handle HTTP 401 Unauthorized (Expired or invalid token)
      if (error.response.status === 401) {
        await SecureStore.deleteItemAsync('userToken')
      }

      const errorMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        `Request failed with status ${error.response.status}`

      return Promise.reject(new Error(errorMessage))
    }

    if (error.request) {
      // Request made but no response received (Network down or Render cold start)
      return Promise.reject(
        new Error('Unable to reach MediMove server. Please check your network connection.')
      )
    }

    return Promise.reject(new Error(error.message || 'An unexpected error occurred'))
  }
)