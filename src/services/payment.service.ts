import type {
  InitializePaymentResponse,
  Pagination,
  PayWithWalletResponse,
  Payment,
  PaymentEvent,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../types'
import { http } from './api'

export interface InitializePaymentInput {
  type: PaymentType
  method?: PaymentMethod
  bookingId?: string
  savingsGoalId?: string
  /** Only for SAVINGS, where the payer chooses the contribution (integer kobo). */
  amountKobo?: number
}

export const paymentService = {
  initialize: (input: InitializePaymentInput) =>
    http.post<InitializePaymentResponse>('/payments/initialize', input),

  /** Verify with the gateway and settle. `isCancelled` is a hint only. */
  verify: (txnRef: string, isCancelled?: boolean) =>
    http.post<{
      success: boolean
      status: PaymentStatus
      alreadySettled: boolean
      message: string
      payment: Payment
    }>('/payments/verify', { txnRef, isCancelled }),

  /** Pay a booking straight from the wallet (atomic server-side debit). */
  payWithWallet: (bookingId: string) =>
    http.post<PayWithWalletResponse>('/payments/pay-with-wallet', { bookingId }),

  history: (params?: { page?: number; limit?: number; status?: PaymentStatus; type?: PaymentType }) =>
    http.get<{ success: boolean; payments: Payment[]; pagination: Pagination }>('/payments/history', { params }),

  get: (id: string) =>
    http.get<{ success: boolean; payment: Payment; events: PaymentEvent[] }>(`/payments/${id}`),

  retry: (paymentId: string, method?: PaymentMethod) =>
    http.post<InitializePaymentResponse>('/payments/retry', { paymentId, method }),

  receipt: (id: string) => http.get<{ success: boolean; payment: Payment }>(`/payments/${id}/receipt`),
}
