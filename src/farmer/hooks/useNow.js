import { useEffect, useState } from 'react'

/** The current time, updated every intervalMs so "Updated 5 minutes ago" keeps counting. */
export function useNow(intervalMs = 60 * 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
