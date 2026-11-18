export interface User {
  id: string
  email: string
  fullName: string
  walletBalanceKobo: number
}

export interface AmbulanceProvider {
  id: string
  name: string
  latitude: number
  longitude: number
  vehicleType: 'Standard BLS' | 'Advanced ICU'
  proximityKm: number
  phone: string
}

export interface Hospital {
  id: string
  name: string
  latitude: number
  longitude: number
  address: string
}

export interface Booking {
  id: string
  reference: string
  pickupAddress: string
  destAddress: string
  distanceKm: number
  estimatedFare: number
  status: 'PENDING' | 'ACCEPTED' | 'EN_ROUTE' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  userId: string
}

export interface Payment {
  id: string
  transactionRef: string
  interswitchRef?: string
  amountKobo: number
  currency: string
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED'
  type: 'BOOKING' | 'WALLET_TOPUP' | 'VAULT_DEPOSIT'
  createdAt: string
}

export interface SavingsGoal {
  id: string
  title: string
  targetAmountKobo: number
  currentAmountKobo: number
  userId: string
}