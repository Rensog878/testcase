// "Use my current location" at checkout: the phone's GPS point, then the
// address at that point from OpenStreetMap's free Nominatim service (no key;
// one lookup per tap, well inside its usage policy). The point itself goes on
// the order and the saved address (server/geo.js), so delivery staff can open
// it in Maps. Only ever asked when the customer taps the button.

import { STATES } from '../hooks/checkoutRules'
import { addressFromOsm } from '../shared/osmAddress'

export const locationSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  && (typeof window === 'undefined' || window.isSecureContext !== false)

const MESSAGES = {
  1: 'Location is blocked for this site. Allow it in your browser settings, or type your address below.',
  2: "We couldn't find your location. Turn on location (GPS) on your phone and try again.",
  3: 'Finding your location took too long. Please try again, near a window or outdoors.',
}

// Resolves to { lat, lng, accuracy } or rejects with a message for the customer.
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!locationSupported) {
      reject(new Error('Location is not available in this browser. Please type your address.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: Math.round(coords.accuracy) }),
      error => reject(new Error(MESSAGES[error.code] || MESSAGES[2])),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    )
  })
}

// The address at a point, in English so couriers can read it. {} when the
// lookup fails: the point is still kept and the customer types the rest.
export async function addressAt({ lat, lng }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en&lat=${lat}&lon=${lng}`
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) return {}
    const data = await response.json()
    return addressFromOsm(data?.address, STATES)
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}
