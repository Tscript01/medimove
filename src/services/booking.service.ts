import type {
  Booking,
  BookingStatus,
  BookingStatusHistory,
  EmergencyCategory,
  FareEstimate,
  Gender,
  Pagination,
  TrackingView,
} from '../types'
import { http } from './api'

/**
 * Booking creation payload. The server computes distance and fare — never send
 * a price. `providerId` and `callbackPhone` are required; a destination is
 * either coordinates (`destLat`/`destLng`) or a `destinationHospitalId`.
 */
export interface CreateBookingInput {
  providerId: string
  pickupLat: number
  pickupLng: number
  pickupAddress?: string
  landmark?: string

  destLat?: number
  destLng?: number
  destAddress?: string
  destinationHospitalId?: string

  isForSelf?: boolean
  patientName?: string
  patientPhone?: string
  patientAge?: number
  patientGender?: Gender

  callbackPhone: string
  emergencyCategory: EmergencyCategory
  notes?: string
  /** Unique per requester so a retried create is idempotent. */
  idempotencyKey?: string
}

export interface EstimateFareInput {
  pickupLat: number
  pickupLng: number
  destLat: number
  destLng: number
}

export const bookingService = {
  /** Server-computed fare estimate (optional, shown before dispatch). */
  estimateFare: (input: EstimateFareInput) =>
    http.post<{ success: boolean; estimate: FareEstimate }>('/pricing/estimate', input),

  create: (input: CreateBookingInput) =>
    http.post<{ success: boolean; reused: boolean; booking: Booking }>('/bookings', input),

  /** List bookings scoped to the caller's role, newest first. */
  list: (params?: { page?: number; limit?: number; status?: BookingStatus }) =>
    http.get<{ success: boolean; bookings: Booking[]; pagination: Pagination }>('/bookings', { params }),

  get: (id: string) => http.get<{ success: boolean; booking: Booking }>(`/bookings/${id}`),

  history: (id: string) =>
    http.get<{ success: boolean; history: BookingStatusHistory[] }>(`/bookings/${id}/history`),

  /** Last-known position + ETA. Poll this while a trip is active. */
  tracking: (id: string) => http.get<{ success: boolean; tracking: TrackingView }>(`/bookings/${id}/tracking`),

  cancel: (id: string, reason?: string) =>
    http.post<{ success: boolean; booking: Booking }>(`/bookings/${id}/cancel`, { reason }),
}
