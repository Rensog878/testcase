import { useCallback, useEffect, useRef, useState } from 'react'
import { farmerCache } from '../data/farmerCache.js'

const NO_STATE = { entry: null, loading: false, error: null }

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false

/**
 * Reads one cached resource and keeps it fresh.
 * Shows the last saved response straight away, refetches when it is older than
 * maxAgeMs, retries when the connection comes back, and never refetches just
 * because a component re-rendered.
 */
export function useResource({ key, fetcher, maxAgeMs }) {
  const [snapshot, setSnapshot] = useState(() => (key ? farmerCache.getState(key) : NO_STATE))
  const [online, setOnline] = useState(isOnline)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!key) {
      setSnapshot(NO_STATE)
      return undefined
    }
    const sync = () => setSnapshot(farmerCache.getState(key))
    const unsubscribe = farmerCache.subscribe(key, sync)
    sync()
    // Failures are kept in the cache state and shown by the card.
    farmerCache.load(key, () => fetcherRef.current(), { maxAgeMs }).catch(() => {})
    return unsubscribe
  }, [key, maxAgeMs])

  const retry = useCallback(() => {
    if (key) farmerCache.load(key, () => fetcherRef.current(), { force: true }).catch(() => {})
  }, [key])

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      retry()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [retry])

  return {
    data: snapshot.entry ? snapshot.entry.data : undefined,
    hasData: Boolean(snapshot.entry),
    fetchedAt: snapshot.entry ? snapshot.entry.fetchedAt : null,
    loading: snapshot.loading,
    error: snapshot.error,
    online,
    retry,
  }
}
