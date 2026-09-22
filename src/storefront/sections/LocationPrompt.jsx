import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLanguage } from '../../context/LanguageContext'
import { currentPosition, locationSupported } from '../location'
import { readGuestContact } from '../guestContact'
import { showToast } from '../toast'

// Every store visitor is asked for their location, and where it is allowed it
// is stored (POST /api/visitor-location, one record per browser).
// - Not decided yet: a small card explains why, and its Allow button opens the
//   browser's own permission prompt. Asking from a tap, not on page load, is
//   what keeps Chrome from switching the site to its hidden "quiet" prompt.
//   "Not now" asks again on the next visit.
// - Already allowed: the point is sent once per visit with no card at all.
// - Blocked: nothing is shown; the browser would not ask again anyway.
// Non-blocking (the page scrolls under it) and never over another popup.
// Styles: storefront.css, "7p. LOCATION CARD".

const VISITOR_KEY = 'sb_visitor_id'
const SENT_KEY = 'sb_location_sent' // this visit (sessionStorage)
const ASKED_KEY = 'sb_location_asked' // this visit (sessionStorage)
const SHOW_AFTER_MS = 4000

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = `v_${(crypto.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}`
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

const session = {
  get: key => { try { return sessionStorage.getItem(key) === '1' } catch { return false } },
  set: key => { try { sessionStorage.setItem(key, '1') } catch { /* private mode */ } },
}

async function permissionState() {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' })
    return status?.state || 'prompt'
  } catch {
    return 'prompt'
  }
}

const screenBusy = () => document.body.classList.contains('overlay-open')
  || document.documentElement.classList.contains('sb-guest-lock')
  || document.documentElement.classList.contains('sb-scroll-lock')

export default function LocationPrompt() {
  const { lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const send = async point => {
    const id = visitorId()
    if (!id) return false
    const guest = readGuestContact()
    try {
      await axios.post('/api/visitor-location', {
        visitorId: id, geo: point, page: window.location.pathname, lang,
        name: guest?.name || '', phone: guest?.phone || '',
      })
      session.set(SENT_KEY)
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (!locationSupported || session.get(SENT_KEY)) return undefined
    let cancelled = false
    let timer = 0
    permissionState().then(state => {
      if (cancelled) return
      if (state === 'granted') {
        currentPosition().then(point => { if (!cancelled) send(point) }).catch(() => {})
        return
      }
      if (state === 'denied' || session.get(ASKED_KEY)) return
      // Shown once nothing else is on screen (the Stay connected card, sign-in, checkout).
      const tryShow = () => {
        if (cancelled) return
        if (screenBusy()) { timer = setTimeout(tryShow, 2000); return }
        setOpen(true)
      }
      timer = setTimeout(tryShow, SHOW_AFTER_MS)
    })
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const allow = async () => {
    setBusy(true)
    session.set(ASKED_KEY)
    try {
      const point = await currentPosition()
      await send(point)
      setOpen(false)
      showToast('Thank you! We will show delivery and crop advice for your area.', 'success')
    } catch (err) {
      setOpen(false)
      showToast(err.message, 'info')
    } finally {
      setBusy(false)
    }
  }

  const later = () => {
    session.set(ASKED_KEY)
    setOpen(false)
  }

  if (!open) return null
  return (
    <div className="sb-locate-card" role="dialog" aria-labelledby="sbLocateTitle" aria-describedby="sbLocateText">
      <span className="sb-locate-icon" aria-hidden="true"><i className="fa-solid fa-location-dot"></i></span>
      <div className="sb-locate-body">
        <p id="sbLocateTitle" className="sb-locate-title">Share your location</p>
        <p id="sbLocateText" className="sb-locate-text">For faster delivery and crop advice for your area.</p>
        <div className="sb-locate-actions">
          <button type="button" className="sb-locate-allow" onClick={allow} disabled={busy}>
            {busy ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Finding your location...</> : <><i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i> Allow location</>}
          </button>
          <button type="button" className="sb-locate-later" onClick={later} disabled={busy}>Not now</button>
        </div>
      </div>
    </div>
  )
}
