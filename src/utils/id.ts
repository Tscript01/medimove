/**
 * Client-side id helpers. Used for idempotency keys so a retried booking
 * create (e.g. a flaky network) doesn't dispatch a second ambulance.
 */

/** A reasonably unique, URL-safe key. Not cryptographically strong. */
export function makeIdempotencyKey(): string {
  const rand = Math.random().toString(36).slice(2, 12)
  return `${Date.now().toString(36)}-${rand}`
}
