import type {
  AvailabilityStatus,
  Booking,
  CrewDocument,
  CrewProfile,
  CrewTripStatus,
  DispatchOffer,
  Payment,
  TrackingView,
  TripLocation,
} from '../types'
import { http } from './api'

/**
 * Crew role surface. Every endpoint here is scoped by the backend to the
 * signed-in crew member's own profile or own accepted trips. The client only
 * renders what the server returns; it never invents offers, availability, ETAs
 * or a "live" location.
 */

export interface UpdateCrewProfileInput {
  licenseNumber?: string | null
  yearsExperience?: number | null
  availability?: AvailabilityStatus
}

export interface SubmitCrewDocumentInput {
  type: string
  /** The backend does not upload files; this must be an already-hosted URL. */
  fileUrl: string
  expiresAt?: string
}

export interface RecordCrewLocationInput {
  latitude: number
  longitude: number
  accuracyMeters?: number
  speedKph?: number
  headingDeg?: number
  source?: 'GPS' | 'MAP_PIN'
}

export interface CollectCashInput {
  bookingId: string
  /** Integer kobo. Omit to let the server use the confirmed fare. */
  amountKobo?: number
  note?: string
}

const idPath = (id: string) => encodeURIComponent(id)

export const crewService = {
  me: () => http.get<{ success: boolean; crew: CrewProfile }>('/crew/me'),

  updateMe: (input: UpdateCrewProfileInput) =>
    http.patch<{ success: boolean; crew: CrewProfile }>('/crew/me', input),

  /** Use this for availability changes: it enforces the active/suspended guard. */
  setAvailability: (availability: AvailabilityStatus) =>
    http.post<{ success: boolean; crew: CrewProfile }>('/crew/me/availability', { availability }),

  documents: () =>
    http.get<{ success: boolean; documents: CrewDocument[] }>('/crew/me/documents'),

  submitDocument: (input: SubmitCrewDocumentInput) =>
    http.post<{ success: boolean; document: CrewDocument }>('/crew/me/documents', input),

  /**
   * Historical offers are included by the backend. Filter on
   * `status === 'PENDING' && isLive === true` — never on a local clock guess.
   */
  offers: () =>
    http.get<{ success: boolean; offers: DispatchOffer[] }>('/dispatch/offers/me'),

  acceptOffer: (offerId: string) =>
    http.post<{ success: boolean; booking: Booking }>(
      `/dispatch/offers/${idPath(offerId)}/accept`,
    ),

  rejectOffer: (offerId: string, reason?: string) =>
    http.post<{ success: boolean; offer: DispatchOffer }>(
      `/dispatch/offers/${idPath(offerId)}/reject`,
      { reason },
    ),

  /** Defaults to the backend's active trip statuses. `active: 'false'` lists all. */
  trips: (params?: { status?: Booking['status']; active?: 'true' | 'false' }) =>
    http.get<{ success: boolean; trips: Booking[] }>('/crew/me/trips', { params }),

  trip: (bookingId: string) =>
    http.get<{ success: boolean; trip: Booking }>(`/crew/me/trips/${idPath(bookingId)}`),

  /** PATCH (not POST). Only forward milestones are accepted by the server. */
  updateTripStatus: (bookingId: string, status: CrewTripStatus) =>
    http.patch<{ success: boolean; trip: Booking }>(
      `/crew/me/trips/${idPath(bookingId)}/status`,
      { status },
    ),

  reportNoShow: (bookingId: string, reason: string) =>
    http.post<{ success: boolean; trip: Booking }>(
      `/crew/me/trips/${idPath(bookingId)}/no-show`,
      { reason },
    ),

  recordLocation: (bookingId: string, input: RecordCrewLocationInput) =>
    http.post<{ success: boolean; location: TripLocation }>(
      `/crew/me/trips/${idPath(bookingId)}/location`,
      input,
    ),

  collectCash: (input: CollectCashInput) =>
    http.post<{ success: boolean; payment: Payment }>('/payments/cash', input),

  /** Booking detail for an offer: the offer object itself has no snapshot. */
  booking: (bookingId: string) =>
    http.get<{ success: boolean; booking: Booking }>(`/bookings/${idPath(bookingId)}`),

  /** Polling-only tracking view; use the server's `isLive`/`isStale` fields. */
  tracking: (bookingId: string) =>
    http.get<{ success: boolean; tracking: TrackingView }>(
      `/bookings/${idPath(bookingId)}/tracking`,
    ),
}
