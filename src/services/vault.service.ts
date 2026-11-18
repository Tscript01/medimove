import { SavingsGoal } from '../types'
import { api } from './api'

export const vaultService = {
  getGoals: async (): Promise<SavingsGoal[]> => {
    return api.get('/vault/goals')
  },

  createGoal: async (title: string, targetAmountKobo: number): Promise<SavingsGoal> => {
    return api.post('/vault/goals', { title, targetAmountKobo })
  },

  verifyHmoPolicy: async (provider: string, policyNumber: string): Promise<{ eligible: boolean; discountPercentage: number }> => {
    return api.post('/vault/hmo/verify', { provider, policyNumber })
  },
}