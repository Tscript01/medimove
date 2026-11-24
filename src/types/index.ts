/**
 * API domain types.
 *
 * These mirror the backend's response serializers (`src/utils/serializers.ts`)
 * exactly, so a response can be consumed without guessing. Money is always an
 * integer in **kobo** (1 NGN = 100 kobo).
 */

export type Role =
  | 'PATIENT'
  | 'CREW'
  | 'DISPATCHER'
  | 'HOSPITAL_STAFF'
  | 'PROVIDER_ADMIN'
  | 'PLATFORM_ADMIN'
  | 'STATE_ADMIN'

export type BookingStatus =
  | 'REQUESTED'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'PATIENT_ON_BOARD'
  | 'AT_HOSPITAL'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'

export type EmergencyCategory =
  | 'MEDICAL'
  | 'TRAUMA'
  | 'CARDIAC'
  | 'RESPIRATORY'
  | 'OBSTETRIC'
  | 'PEDIATRIC'
  | 'PSYCHIATRIC'
  | 'ACCIDENT'
  | 'OTHER'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED'

export type PaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED'
export type PaymentType = 'BOOKING' | 'SAVINGS' | 'WALLET_FUNDING' | 'WALLET_PAYMENT'
export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'CASH' | 'OTHER'

/** Shape returned by the backend `toPublicUser` serializer. */
export interface User {
  id: string
  email: string
  fullName: string
  phone: string
  role: Role
  walletBalanceKobo: number
  emailVerified: boolean
  emailVerifiedAt: string | null
  phoneVerified: boolean
  phoneVerifiedAt: string | null
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  user: User
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: string
  refreshTokenExpiresAt: string
}

/** Returned by `/auth/refresh` — no user, the caller already has it. */
export interface RefreshResponse {
  success: boolean
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: string
  refreshTokenExpiresAt: string
}

/** Generic pagination envelope used by list endpoints. */
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/** The provider relation attached to a booking when it has been matched. */
export interface BookingProvider {
  id: string
  name: string
  vehicleType: string
  phone: string
}

/** Shape returned by the backend `toBooking` serializer. */
export interface Booking {
  id: string
  reference: string
  userId: string
  providerId: string | null
  stateId: string | null
  destinationHospitalId: string | null

  pickupAddress: string
  pickupLat: number
  pickupLng: number
  landmark: string | null

  destAddress: string
  destLat: number | null
  destLng: number | null

  isForSelf: boolean
  patientName: string | null
  patientPhone: string | null
  patientAge: number | null
  patientGender: Gender | null
  callbackPhone: string | null

  emergencyCategory: EmergencyCategory | null
  notes: string | null
  requestedAt: string | null

  distanceKm: number
  estimatedFare: number
  fareBreakdown: Record<string, unknown> | null
  pricingConfigId: string | null
  paidAt: string | null

  status: BookingStatus
  isDispatched: boolean
  acceptedAt: string | null
  acceptedById: string | null
  assignedAmbulanceId: string | null

  enRouteAt: string | null
  arrivedAt: string | null
  patientOnBoardAt: string | null
  atHospitalAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  failedAt: string | null
  noShowAt: string | null
  noShowReason: string | null
  isNoShow: boolean

  createdAt: string | null
  updatedAt: string | null

  /** Present on list/detail reads that loaded the relation. */
  provider?: BookingProvider
}

/** One entry in a booking's append-only status history. */
export interface BookingStatusHistory {
  id: string
  bookingId: string
  fromStatus: BookingStatus | null
  toStatus: BookingStatus
  actorId: string | null
  actorRole: string | null
  reason: string | null
  createdAt: string | null
}

/** A GPS fix on a trip. `isLive` is derived from the server-recorded time. */
export interface TripLocation {
  id: string | null
  bookingId: string | null
  /** Which party produced this fix. Requester fixes are never used for crew ETA. */
  subject: 'CREW' | 'REQUESTER'
  ambulanceId: string | null
  crewProfileId: string | null
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  speedKph: number | null
  headingDeg: number | null
  source: string
  recordedAt: string | null
  ageSeconds: number | null
  staleAfterSeconds: number
  isLive: boolean
  status: 'LIVE' | 'STALE'
}

/** The minimal, non-PHI tracking view for a booking. */
export interface TrackingView {
  bookingId: string | null
  status: BookingStatus
  isLive: boolean
  /** Separate moving-pickup stream; visible only to the requester and assigned crew. */
  isRequesterLocationLive: boolean
  staleAfterSeconds: number
  lastKnownSource: string | null
  location: TripLocation | null
  requesterLocation: TripLocation | null
  nextWaypoint: {
    kind: 'PICKUP' | 'DESTINATION'
    address: string | null
    lat: number
    lng: number
  } | null
  distanceRemainingKm: number | null
  etaMinutes: number | null
  etaAt: string | null
  recentLocations: TripLocation[]
}

/** A hospital ranked by proximity in the fleet response. */
export interface RankedHospital {
  id: string
  name: string
  city: string
  lat: number
  lng: number
  category: string
  distanceKm: number
  isRecommended: boolean
}

/** A nearby ambulance provider returned by `GET /ambulances`. */
export interface FleetProvider {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  contactName: string | null
  registrationNumber: string | null
  vehicleType: string
  baseFareKobo: number
  ratePerKmKobo: number
  latitude: number
  longitude: number
  stateId: string | null
  status: string
  verificationStatus: string
  availableStatus: boolean
  isSimulated: boolean
  proximityKm: number
  tripDistanceKm: number
  initialFareKobo: number
  initialFareNGN: number
  isRecommended: boolean
}

/** Response of `GET /ambulances?lat&lng`. */
export interface FleetResponse {
  success: boolean
  userLocation: {
    lat: number
    lng: number
    pickupAddress: string
    destAddress: string
    distanceKm: number
  }
  hospitals: RankedHospital[]
  data: FleetProvider[]
}

/** A server-computed fare estimate. */
export interface FareEstimate {
  distanceKm: number
  estimatedFareKobo: number
  currency: string
  breakdown: Record<string, unknown> | null
  pricingConfig: Record<string, unknown> | null
}

/** Shape returned by the backend `toPayment` serializer. */
export interface Payment {
  id: string
  transactionRef: string
  providerReference: string | null
  amountKobo: number
  amountNGN: number
  currency: string
  status: PaymentStatus
  type: PaymentType
  method: PaymentMethod
  bookingId: string | null
  savingsGoalId: string | null
  userId: string | null
  responseCode: string | null
  responseDescription: string | null
  verifiedAt: string | null
  refundStatus: string
  refundedAmountKobo: number
  receiptNumber: string | null
  receiptIssuedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

/** The Interswitch payload returned when a payment is initialized. */
export interface InterswitchPayload {
  merchantCode: string
  payItemId: string
  amount: number
  txnRef: string
  currency: number
  customerEmail: string
  mode: string
  redirectUrl: string
  method: PaymentMethod
}

export interface WalletBalanceResponse {
  success: boolean
  walletBalanceKobo: number
  walletBalanceNGN: number
}

export interface FundWalletResponse {
  success: boolean
  payment: Payment
  /** Null for non-gateway methods. */
  interswitchPayload: InterswitchPayload | null
}

export interface InitializePaymentResponse {
  success: boolean
  payment: Payment
  /** Null for non-gateway methods. */
  interswitchPayload: InterswitchPayload | null
}

export interface PayWithWalletResponse {
  success: boolean
  message: string
  walletBalanceNGN: number
  payment: Payment
  /** Raw backend booking record; not consumed by the app. */
  booking: unknown
}

export interface SavingsContribution {
  id: string
  savingsGoalId: string
  paymentId: string | null
  amountKobo: number
  createdAt: string
  payment?: Payment | null
}

export interface SavingsGoal {
  id: string
  userId: string
  title: string
  targetAmountKobo: number
  currentAmountKobo: number
  createdAt: string
  updatedAt: string
  contributions: SavingsContribution[]
}

export interface InsuranceEligibility {
  success: boolean
  isSupported: boolean
  coveragePercentage: number
  statusLabel: string
  message: string
}

/** One entry in a payment's append-only timeline. */
export interface PaymentEvent {
  id: string
  paymentId: string | null
  type: string
  source: string
  actorId: string | null
  message: string | null
  reference: string | null
  metadata: Record<string, unknown> | null
  createdAt: string | null
}

/** A hospital directory entry (`GET /hospitals`). */
export interface Hospital {
  id: string
  name: string
  city: string
  stateId: string | null
  state: { id: string; name: string; code: string } | null
  lat: number
  lng: number
  category: string | null
  phone: string | null
  email: string | null
  address: string | null
  landmark: string | null
  isActive: boolean
  acceptsEmergencies: boolean
  createdAt: string | null
  updatedAt: string | null
}

// --- Crew -------------------------------------------------------------------
// These mirror `toCrewProfile`, `toCrewDocument` and `toDispatchOffer` in the
// backend serializers. Crew is a distinct role surface: an OFFER is not an
// assigned trip, and neither is ever synthesized by the client.

export type AvailabilityStatus = 'AVAILABLE' | 'ON_DUTY' | 'OFFLINE' | 'UNAVAILABLE'
export type CrewStatus = 'INVITED' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
export type CrewRole = 'DRIVER' | 'EMT' | 'PARAMEDIC' | 'NURSE' | 'DOCTOR' | 'ATTENDANT'
export type CrewTripStatus = 'EN_ROUTE' | 'ARRIVED' | 'PATIENT_ON_BOARD' | 'AT_HOSPITAL' | 'COMPLETED'
export type CrewDocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface CrewProfile {
  id: string
  userId: string
  providerId: string
  crewRole: CrewRole
  status: CrewStatus
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  availability: AvailabilityStatus
  licenseNumber: string | null
  yearsExperience: number | null
  assignedAmbulanceId: string | null
  verifiedAt: string | null
  deactivatedAt: string | null
  deactivationReason: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface CrewDocument {
  id: string
  crewProfileId: string
  type: string
  fileUrl: string
  status: CrewDocumentStatus
  reviewedAt: string | null
  rejectionReason: string | null
  expiresAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

/** A dispatch offer for the signed-in crew member (historical offers included). */
export interface DispatchOffer {
  id: string
  bookingId: string
  providerId: string
  ambulanceId: string
  crewProfileId: string
  round: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'
  /** Server-computed: PENDING and not expired. Never derive this locally. */
  isLive: boolean
  distanceKm: number | null
  capabilityMatch: boolean
  offeredAt: string | null
  expiresAt: string | null
  respondedAt: string | null
  rejectionReason: string | null
  createdAt: string | null
  updatedAt: string | null
}
