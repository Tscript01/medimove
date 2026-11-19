import { useCallback, useEffect, useEffectEvent, useRef, useState, type DependencyList } from 'react'

export interface AsyncState<T> {
  data: T | null
  /** Human-readable error message, or null. */
  error: string | null
  /** True during the first load (show a skeleton). */
  loading: boolean
  /** True during a pull-to-refresh (keep the old data on screen). */
  refreshing: boolean
  /** Re-run and show the loading state. */
  reload: () => void
  /** Re-run while keeping current data (pull-to-refresh). */
  refresh: () => void
  /** Optimistically replace the data. */
  setData: (updater: T | null | ((prev: T | null) => T | null)) => void
}

/**
 * Runs an async loader and tracks loading/error/data. `deps` behave like
 * `useEffect` deps: change them to re-run. Results from a superseded or
 * unmounted run are discarded so the UI never shows stale data.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: DependencyList = [],
  options: { immediate?: boolean } = {}
): AsyncState<T> {
  const { immediate = true } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [refreshing, setRefreshing] = useState(false)

  const runIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Keep the latest loader without making it a dependency of `run`.
  // Callers pass inline loaders, so this is synchronized in an Effect rather
  // than during render.
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  }, [loader])

  const run = useCallback(async (mode: 'load' | 'refresh') => {
    const runId = ++runIdRef.current
    if (mode === 'load') setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const result = await loaderRef.current()
      if (runId !== runIdRef.current || !mountedRef.current) return
      setData(result)
    } catch (err) {
      if (runId !== runIdRef.current || !mountedRef.current) return
      setError((err as Error)?.message || 'Something went wrong.')
    } finally {
      if (runId === runIdRef.current && mountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  // The fetch is an Effect event: it runs when the caller's deps change, but
  // `run` is still a normal callback so the UI can call reload()/refresh().
  const loadOnDepsChange = useEffectEvent(() => {
    void run('load')
  })

  useEffect(() => {
    if (!immediate) return
    // Defer to a microtask: loading is async work, not a synchronous state
    // update during the Effect itself.
    void Promise.resolve().then(() => loadOnDepsChange())
    // Re-run whenever the caller's deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps])

  const reload = useCallback(() => {
    void run('load')
  }, [run])

  const refresh = useCallback(() => {
    void run('refresh')
  }, [run])

  const updateData = useCallback((updater: T | null | ((prev: T | null) => T | null)) => {
    setData((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev) : updater))
  }, [])

  return { data, error, loading, refreshing, reload, refresh, setData: updateData }
}
