/**
 * A tiny event channel so the API layer can tell the app that a session is
 * dead (refresh token rejected/revoked) without importing the auth store —
 * which would create a circular dependency (`api` -> `store` -> `api`).
 *
 * `api.ts` calls `emitAuthExpired()`; `authStore.ts` subscribes and clears the
 * session, and the navigation guards then send the user back to login.
 */

type Listener = () => void

const listeners = new Set<Listener>()

export function onAuthExpired(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitAuthExpired(): void {
  for (const listener of listeners) listener()
}
