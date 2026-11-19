import type { SavingsGoal } from '../types'
import { http } from './api'

/**
 * Savings goals. The backend auto-creates a starter "Emergency Medical
 * Transport Reserve" goal on first read, so this always returns at least one.
 */
export const savingsService = {
  list: () => http.get<{ success: boolean; goals: SavingsGoal[] }>('/savings'),
}
