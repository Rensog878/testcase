import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { StoreContext } from '../StoreContext'
import { setBodyFlag } from '../bodyFlags'
import { showToast } from '../toast'
import { MOBILE_RE, guestPromptSnoozed, readGuestContact, saveGuestContact, snoozeGuestPrompt } from '../guestContact'
import Modal from './Modal'

// "Stay connected": a visitor who is not signed in, scrolling down any store
// page, is asked once for their name and mobile number. It never blocks the
// page: closing it (×, "Maybe later", Escape, a tap outside, a swipe down)
// lets them carry on and it stays away for a week. What they give is kept on
// this device (guestContact.js) and fills in the sign-in card later.
// Styles: storefront.css, "7m. STAY CONNECTED CARD".

const ID = 'guestContactModal'
// How far down before it appears: about one screen, a real scroll but not a
// share of the page (the home page is ~9 screens long on a phone).
const MIN_SCROLL = 400
const SCREEN_SHARE = 0.8

// Another popup, the welcome poster or the checkout already has the screen.
const screenBusy = () => {
  const body = document.body.classList
  return body.contains('overlay-open') || body.contains('poster-open') || document.documentElement.classList.contains('sb-scroll-lock')
}

export default function GuestContactPrompt() {
  const { user, loading } = useAuth()
  const [state, setState] = useState(undefined) // undefined | 'opening' | 'open'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const asked = useRef(false) // once per page load at most

  const open = Boolean(state)
  const eligible = !loading && !user && !asked.current

  // Wait for a real scroll down, then ask when nothing else is on screen.
  useEffect(() => {
    if (!eligible || readGuestContact() || guestPromptSnoozed()) return undefined
    let frame = 0
    const check = () => {
      frame = 0
      const room = document.documentElement.scrollHeight - window.innerHeight
      const needed = Math.min(Math.max(MIN_SCROLL, window.innerHeight * SCREEN_SHARE), room - 40)
      if (room <= 0 || window.scrollY < needed || screenBusy()) return
      asked.current = true
      window.removeEventListener('scroll', onScroll)
      setState('opening')
      requestAnimationFrame(() => requestAnimationFrame(() => setState(s => (s ? 'open' : s))))
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [eligible])

  // Signed in meanwhile (another tab, the sign-in card): nothing left to ask.
  useEffect(() => { if (user) setState(undefined) }, [user])

  useEffect(() => {
    setBodyFlag('overlay-open', 'guest-contact', open)
    return () => setBodyFlag('overlay-open', 'guest-contact', false)
  }, [open])

  const close = ({ saved = false } = {}) => {
    if (!saved) snoozeGuestPrompt()
    setState(undefined)
  }

  useEffect(() => {
    if (!open) return undefined
    const onKey = event => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  // First field focused once it has slid in (not on phones: no keyboard jump).
  useEffect(() => {
    if (state === 'open' && window.matchMedia('(hover: hover)').matches) document.getElementById('guestName')?.focus({ preventScroll: true })
  }, [state])

  const store = useMemo(() => ({ closeModal: () => close() }), [])

  const check = () => {
    const next = {}
    if ((name.trim().match(/\p{L}/gu) || []).length < 2) next.name = 'Please enter your name.'
    if (!MOBILE_RE.test(phone)) next.phone = phone ? 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.' : 'Please enter your mobile number.'
    setErrors(next)
    return next
  }

  const submit = event => {
    event.preventDefault()
    const bad = check()
    if (bad.name || bad.phone) {
      document.getElementById(bad.name ? 'guestName' : 'guestPhone')?.focus()
      return
    }
    saveGuestContact({ name, phone })
    close({ saved: true })
    showToast(`Thank you, ${name.trim()}!`, 'success')
  }

  if (!state) return null

  return (
    <StoreContext.Provider value={store}>
      <Modal
        id={ID}
        state={state}
        cardClassName="modal-card guest-card"
        cardProps={{ role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'guestTitle' }}
        closeProps={{ 'aria-label': 'Close' }}
      >
        <div className="guest-head">
          <span className="guest-badge" aria-hidden="true"><i className="fa-solid fa-seedling"></i></span>
          <h2 id="guestTitle" className="guest-title">Stay connected with us</h2>
          <p className="guest-lead">Share your name and mobile number. Next time you sign in or create an account, we fill them in for you.</p>
        </div>

        <form className="auth-form guest-form" onSubmit={submit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="guestName">Your name</label>
            <div className="auth-control">
              <input
                id="guestName" className={`auth-input${errors.name ? ' sb-input-invalid' : ''}`} type="text" autoComplete="name" autoCapitalize="words"
                maxLength={80} enterKeyHint="next" placeholder="Your full name" value={name}
                aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'guestNameHint' : undefined}
                onChange={event => { setName(event.target.value); if (errors.name) setErrors(e => ({ ...e, name: undefined })) }}
              />
              <i className="fa-solid fa-user auth-control-icon" aria-hidden="true"></i>
            </div>
            {errors.name && <small id="guestNameHint" className="sb-field-error">{errors.name}</small>}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="guestPhone">Mobile number</label>
            <div className="auth-control auth-control--prefix">
              <input
                id="guestPhone" className={`auth-input${errors.phone ? ' sb-input-invalid' : ''}`} type="tel" inputMode="numeric" autoComplete="tel-national"
                maxLength={10} enterKeyHint="done" placeholder="9876543210" value={phone}
                aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'guestPhoneHint' : undefined}
                onChange={event => { setPhone(event.target.value.replace(/\D/g, '').slice(-10)); if (errors.phone) setErrors(e => ({ ...e, phone: undefined })) }}
              />
              <span className="auth-prefix" aria-hidden="true">+91</span>
            </div>
            {errors.phone && <small id="guestPhoneHint" className="sb-field-error">{errors.phone}</small>}
          </div>

          <div className="auth-actions">
            <button type="submit" className="auth-cta">
              <i className="fa-solid fa-check" aria-hidden="true"></i> Continue browsing
            </button>
            <button type="button" className="auth-link guest-later" onClick={() => close()}>Maybe later</button>
          </div>
          <p className="guest-privacy"><i className="fa-solid fa-lock" aria-hidden="true"></i> Saved only on this device. No messages are sent.</p>
        </form>
      </Modal>
    </StoreContext.Provider>
  )
}
