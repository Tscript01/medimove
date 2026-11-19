import type { InsuranceEligibility } from '../types'
import { http } from './api'

/** HMO eligibility check against the backend's integrated-insurer list. */
export const insuranceService = {
  checkEligibility: (insurerName: string) =>
    http.post<InsuranceEligibility>('/insurance/eligibility', { insurerName }),
}
