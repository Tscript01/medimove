/**
 * Presentation helpers for money, dates and status. Kept free of React so they
 * can be used in services, stores and components alike.
 *
 * Money is integer kobo everywhere; these helpers only format for display.
 */

import type { BookingStatus, PaymentStatus } from '../types'
import type { BadgeTone } from '../components/ui'

/** Group an integer/decimal number with thousands separators (no Intl needed). */
function group(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals)
  const [intPart, fracPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fracPart ? `${grouped}.${fracPart}` : grouped
}

/** Format integer kobo as naira, e.g. `₦12,500` or `₦12,500.50`. */
export function formatNaira(kobo: number, options?: { decimals?: boolean }): string {
  const naira = (Number.isFinite(kobo) ? kobo : 0) / 100
  const decimals = options?.decimals ? 2 : naira % 1 === 0 ? 0 : 2
  return `₦${group(naira, decimals)}`
}

/** Format a naira amount that is already in naira (not kobo). */
export function formatNairaFromNaira(naira: number): string {
  return `₦${group(Number.isFinite(naira) ? naira : 0, naira % 1 === 0 ? 0 : 2)}`
}

export function koboToNaira(kobo: number): number {
  return (Number.isFinite(kobo) ? kobo : 0) / 100
}

export function nairaToKobo(naira: number): number {
  return Math.round((Number.isFinite(naira) ? naira : 0) * 100)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Short, locale-free date, e.g. `19 Nov 2026`. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Date + time, e.g. `19 Nov 2026, 14:05`. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(iso)}, ${hh}:${mm}`
}

/** Human distance, e.g. `1.2 km` or `450 m`. */
export function formatDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

/** ETA text, e.g. `~6 min`. */
export function formatEta(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—'
  const rounded = Math.max(1, Math.round(minutes))
  return `~${rounded} min`
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

export interface StatusMeta {
  label: string
  tone: BadgeTone
  /** Ionicons name. */
  icon: string
}

const BOOKING_STATUS: Record<BookingStatus, StatusMeta> = {
  REQUESTED: { label: 'Request submitted', tone: 'info', icon: 'send-outline' },
  OFFERED: { label: 'Finding an ambulance', tone: 'info', icon: 'search-outline' },
  ACCEPTED: { label: 'Ambulance assigned', tone: 'primary', icon: 'checkmark-circle-outline' },
  EN_ROUTE: { label: 'Heading to pickup', tone: 'primary', icon: 'navigate-outline' },
  ARRIVED: { label: 'Ambulance arrived', tone: 'warning', icon: 'location-outline' },
  PATIENT_ON_BOARD: { label: 'Patient picked up', tone: 'primary', icon: 'person-add-outline' },
  AT_HOSPITAL: { label: 'At hospital', tone: 'success', icon: 'business-outline' },
  COMPLETED: { label: 'Journey completed', tone: 'success', icon: 'checkmark-done-outline' },
  CANCELLED: { label: 'Request cancelled', tone: 'neutral', icon: 'close-circle-outline' },
  FAILED: { label: 'Request failed', tone: 'danger', icon: 'alert-circle-outline' },
}

export function bookingStatusMeta(status: BookingStatus): StatusMeta {
  return BOOKING_STATUS[status] ?? { label: titleCase(status), tone: 'neutral', icon: 'ellipse-outline' }
}

export const TERMINAL_BOOKING_STATUSES: readonly BookingStatus[] = ['COMPLETED', 'CANCELLED', 'FAILED']

/** Statuses where a requester in another vehicle can still meet the crew. */
export const MOVING_PICKUP_STATUSES: readonly BookingStatus[] = ['ACCEPTED', 'EN_ROUTE', 'ARRIVED']

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return !TERMINAL_BOOKING_STATUSES.includes(status)
}

export function canShareMovingPickup(status: BookingStatus): boolean {
  return MOVING_PICKUP_STATUSES.includes(status)
}

export function paymentStatusTone(status: PaymentStatus): BadgeTone {
  if (status === 'SUCCESSFUL') return 'success'
  if (status === 'FAILED') return 'danger'
  return 'warning'
}

export const EMERGENCY_CATEGORIES = [
  'MEDICAL',
  'TRAUMA',
  'CARDIAC',
  'RESPIRATORY',
  'OBSTETRIC',
  'PEDIATRIC',
  'PSYCHIATRIC',
  'ACCIDENT',
  'OTHER',
] as const

export function emergencyCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    MEDICAL: 'Medical',
    TRAUMA: 'Trauma / Injury',
    CARDIAC: 'Cardiac',
    RESPIRATORY: 'Respiratory',
    OBSTETRIC: 'Obstetric',
    PEDIATRIC: 'Pediatric',
    PSYCHIATRIC: 'Psychiatric',
    ACCIDENT: 'Road accident',
    OTHER: 'Other',
  }
  return labels[category] ?? titleCase(category)
}
