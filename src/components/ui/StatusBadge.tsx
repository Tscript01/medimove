import type { ComponentProps } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Badge, type BadgeTone } from './Badge'
import { bookingStatusMeta, paymentStatusTone, titleCase } from '../../utils/format'

type IconName = ComponentProps<typeof Ionicons>['name']

export interface StatusBadgeProps {
  /** Raw backend status. */
  status: string
  kind?: 'booking' | 'payment'
  /** Override the derived label. */
  label?: string
  /** Override the derived tone. */
  tone?: BadgeTone
  icon?: IconName
}

/** Converts a backend status into the app's compact status chip. */
export function StatusBadge({ status, kind = 'booking', label, tone, icon }: StatusBadgeProps) {
  const meta = bookingStatusMeta(status as Parameters<typeof bookingStatusMeta>[0])

  const resolvedTone: BadgeTone = tone ?? (kind === 'payment'
    ? paymentStatusTone(status as Parameters<typeof paymentStatusTone>[0])
    : meta.tone)
  const resolvedLabel = label ?? (kind === 'payment' ? titleCase(status) : meta.label)
  const resolvedIcon = icon ?? (kind === 'payment' ? undefined : (meta.icon as IconName | undefined))

  return <Badge label={resolvedLabel} tone={resolvedTone} icon={resolvedIcon} />
}
