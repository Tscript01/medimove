import type { FundWalletResponse, PaymentMethod, WalletBalanceResponse } from '../types'
import { http } from './api'

/**
 * Wallet. Funding is a two-step gateway flow: `fund` returns an Interswitch
 * payload (and a PENDING payment); the app opens the gateway, then the payment
 * is settled by verification/webhook — never by the client claiming success.
 */
export const walletService = {
  getBalance: () => http.get<WalletBalanceResponse>('/wallet/balance'),

  /** Start a wallet top-up. `amountNGN` is in naira; the server converts to kobo. */
  fund: (amountNGN: number, method: PaymentMethod = 'CARD') =>
    http.post<FundWalletResponse>('/wallet/fund', { amountNGN, method }),
}
