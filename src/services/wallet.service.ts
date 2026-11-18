import { Payment } from '../types';
import { api } from './api';

export const walletService = {
  getBalance: async (): Promise<{ walletBalanceKobo: number }> => {
    return api.get('/wallet/balance')
  },

  initiateTopup: async (amountKobo: number): Promise<{ transactionRef: string; paymentUrl: string }> => {
    return api.post('/wallet/topup/initiate', { amountKobo })
  },

  verifyPayment: async (transactionRef: string): Promise<Payment> => {
    return api.post('/wallet/verify', { transactionRef })
  },

  getTransactions: async (): Promise<Payment[]> => {
    return api.get('/wallet/transactions')
  },

  payWithWallet: async (bookingId: string, amountKobo: number): Promise<Payment> => {
    return api.post('/wallet/pay-booking', { bookingId, amountKobo })
  },
}