import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { useLanguage } from '../../context/LanguageContext'
import { currentPosition, locationSupported } from '../location'
import { readGuestContact } from '../guestContact'
import { visitorId } from '../visitorId'
import { setBodyFlag } from '../bodyFlags'
import { showToast } from '../toast'

// Every store visitor's location is collected (POST /api/visitor-location,
// one record per browser). Until it has been collected on this visit, a popup
// asks for it - on arrival, and again on every page opened after "Not now":
// - not decided yet: why we ask, and Allow opens the browser's own prompt
//   (from a tap, not on page load, which keeps Chrome from hiding the prompt);
// - blocked in the browser: how to unblock it, then "I've turned it on";
// - GPS off or too slow: what to do, then Try again.
// Already allowed: collected silently on arrival, no popup unless GPS fails.
// Never over another popup (Stay connected, sign-in, checkout).
// Styles: storefront.css, "7p. LOCATION POPUP".

const SENT_KEY = 'sb_location_sent' // collected on this visit (sessionStorage)
const DENIED_KEY = 'sb_location_denied_sent' // denial reported on this visit (sessionStorage)
const FIRST_DELAY_MS = 3000
const PAGE_DELAY_MS = 1200
const LOCK_CLASS = 'sb-loc-lock'

const collected = () => { try { return sessionStorage.getItem(SENT_KEY) === '1' } catch { return false } }
const markCollected = () => { try { sessionStorage.setItem(SENT_KEY, '1') } catch { /* private mode */ } }
const deniedSent = () => { try { return sessionStorage.getItem(DENIED_KEY) === '1' } catch { return false } }
const markDeniedSent = () => { try { sessionStorage.setItem(DENIED_KEY, '1') } catch { /* private mode */ } }
const unmarkDeniedSent = () => { try { sessionStorage.removeItem(DENIED_KEY) } catch { /* private mode */ } }

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

const BLOCKED_STEPS = [
  'Tap the lock or settings icon next to the website address at the top.',
  'Open Permissions (or Site settings), then Location, and choose Allow.',
  'On iPhone: Settings, then Safari, then Location, and choose Allow.',
]

export default function LocationPrompt() {
  const { lang } = useLanguage()
  const { pathname } = useLocation()
  const [view, setView] = useState(null) // null | 'ask' | 'blocked' | 'error'
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const firstCheck = useRef(true)
  const mainButton = useRef(null)
  const open = Boolean(view)

  const send = async point => {
    const id = visitorId()
    if (!id) return false
    const guest = readGuestContact()
    try {
      await axios.post('/api/visitor-location', {
        visitorId: id, geo: point, page: window.location.pathname, lang,
        name: guest?.name || '', phone: guest?.phone || '',
      })
      markCollected()
      return true
    } catch {
      return false
    }
  }

  // Recorded once per visit: the visitor was asked (or the site is blocked)
  // and said no. A later grant always overrides this server-side.
  const reportDenied = () => {
    if (deniedSent()) return
    const id = visitorId()
    if (!id) return
    const guest = readGuestContact()
    markDeniedSent()
    axios.post('/api/visitor-location-denied', {
      visitorId: id, name: guest?.name || '', phone: guest?.phone || '',
    }).catch(unmarkDeniedSent)
  }

  // Collects the point now; on failure the popup explains what to do.
  const collect = async ({ thankYou = true } = {}) => {
    setBusy(true)
    try {
      const point = await currentPosition()
      // Not saved (server unreachable): asked again on the next page.
      const saved = await send(point)
      setView(null)
      if (saved && thankYou) showToast('Thank you! We will show delivery and crop advice for your area.', 'success')
    } catch (err) {
      if ((await permissionState()) === 'denied') {
        setProblem('')
        setView('blocked')
        reportDenied()
      } else {
        setProblem(err.message)
        setView('error')
      }
    } finally {
      setBusy(false)
    }
  }

  // On arrival and on every page change: not collected yet -> ask.
  useEffect(() => {
    if (!locationSupported || collected()) return undefined
    let cancelled = false
    let timer = 0
    const decide = async () => {
      if (cancelled || collected()) return
      if (screenBusy()) { timer = setTimeout(decide, 2000); return }
      const state = await permissionState()
      if (cancelled) return
      if (state === 'granted') collect({ thankYou: false })
      else if (state === 'denied') { setView('blocked'); reportDenied() }
      else setView('ask')
    }
    timer = setTimeout(decide, firstCheck.current ? FIRST_DELAY_MS : PAGE_DELAY_MS)
    firstCheck.current = false
    return () => { cancelled = true; clearTimeout(timer) }
  }, [pathname])

  // A popup: the page behind does not scroll, other popups wait for it.
  useEffect(() => {
    document.documentElement.classList.toggle(LOCK_CLASS, open)
    setBodyFlag('overlay-open', 'location-prompt', open)
    return () => {
      document.documentElement.classList.remove(LOCK_CLASS)
      setBodyFlag('overlay-open', 'location-prompt', false)
    }
  }, [open])

  // Escape is "Not now"; the main button is focused where there is a keyboard.
  useEffect(() => {
    if (!open) return undefined
    if (window.matchMedia('(hover: hover)').matches) mainButton.current?.focus({ preventScroll: true })
    const onKey = event => {
      if (event.key !== 'Escape' || busy) return
      event.preventDefault()
      event.stopPropagation()
      setView(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, view, busy])

  const retryBlocked = async () => {
    if ((await permissionState()) === 'denied') {
      setProblem('Location is still blocked. Please follow the steps above, then try again.')
      return
    }
    setProblem('')
    collect()
  }

  if (!open) return null

  const titles = { ask: 'Share your location', blocked: 'Location is turned off for this site', error: "We couldn't get your location" }
  const leads = {
    ask: 'We use it for faster delivery and crop advice for your area. Your browser will ask you to allow it.',
    blocked: 'To get faster delivery and crop advice for your area, please allow location:',
    error: problem,
  }
  const action = {
    ask: { label: 'Allow location', icon: 'fa-location-crosshairs', run: () => collect() },
    blocked: { label: "I've turned it on", icon: 'fa-rotate-right', run: retryBlocked },
    error: { label: 'Try again', icon: 'fa-rotate-right', run: () => { setProblem(''); collect() } },
  }[view]

  return (
    <div className="sb-loc-overlay" id="locationModal">
      <div className="sb-loc-card" role="dialog" aria-modal="true" aria-labelledby="sbLocTitle" aria-describedby="sbLocLead">
        <span className={`sb-loc-icon${view !== 'ask' ? ' is-warning' : ''}`} aria-hidden="true">
          <i className={`fa-solid ${{ ask: 'fa-location-dot', blocked: 'fa-location-pin-lock', error: 'fa-satellite-dish' }[view]}`}></i>
        </span>
        <h2 id="sbLocTitle" className="sb-loc-title">{titles[view]}</h2>
        <p id="sbLocLead" className="sb-loc-lead">{leads[view]}</p>
        {view === 'blocked' && (
          <ol className="sb-loc-steps">
            {BLOCKED_STEPS.map(step => <li key={step}>{step}</li>)}
          </ol>
        )}
        {view === 'blocked' && problem && <p className="sb-loc-problem" role="alert">{problem}</p>}
        <div className="sb-loc-actions">
          <button ref={mainButton} type="button" className="sb-loc-main" onClick={action.run} disabled={busy}>
            {busy
              ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Finding your location...</>
              : <><i className={`fa-solid ${action.icon}`} aria-hidden="true"></i> {action.label}</>}
          </button>
          <button type="button" className="sb-loc-later" onClick={() => setView(null)} disabled={busy}>Not now</button>
        </div>
      </div>
    </div>
  )
}
