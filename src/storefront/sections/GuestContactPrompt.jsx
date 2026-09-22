import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCheckout, useCheckoutActions } from '../../hooks/useCheckout'
import { setBodyFlag } from '../bodyFlags'
import { showToast } from '../toast'
import { MOBILE_RE, readGuestContact, saveGuestContact } from '../guestContact'

// "Stay connected": a visitor who is not signed in and has not given their
// details is stopped on their first scroll down any store page by a floating
// card asking for their name and mobile number. It is compulsory: there is no
// close button, Escape, tap-outside or swipe, and the page stays locked
// (html.sb-guest-lock) until the details are valid. Someone who already has an
// account can open the sign-in card from it instead; closing that without
// signing in brings this card back. What they give is kept on this device
// (guestContact.js) and fills in the sign-in card later.
// Styles: storefront.css, "7m. STAY CONNECTED CARD".

// A real scroll, not the few pixels a tap can nudge the page.
const TRIGGER_SCROLL = 60
const LOCK_CLASS = 'sb-guest-lock'
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled])'

// The checkout or another popup already has the screen: ask once it closes.
const screenBusy = () => document.body.classList.contains('overlay-open') || document.documentElement.classList.contains('sb-scroll-lock')

export default function GuestContactPrompt() {
  const { user, loading } = useAuth()
  const { modals } = useCheckout()
  const { openSignIn } = useCheckoutActions()
  const [state, setState] = useState(undefined) // undefined | 'opening' | 'open'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const cardRef = useRef(null)

  const open = Boolean(state)
  const guest = !loading && !user
  // The sign-in card opened from here sits on top; this one waits under it.
  const signingIn = Boolean(modals.authModal)

  // The first real scroll down, with nothing else on screen, opens the card.
  useEffect(() => {
    if (!guest || open || readGuestContact()) return undefined
    let frame = 0
    const check = () => {
      frame = 0
      if (window.scrollY < TRIGGER_SCROLL || screenBusy()) return
      setState('opening')
      requestAnimationFrame(() => requestAnimationFrame(() => setState(s => (s ? 'open' : s))))
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [guest, open])

  // Signed in (from this card, another tab or a checkout link): nothing to ask.
  useEffect(() => { if (user) setState(undefined) }, [user])

  // While open the page does not scroll, and the rest of the store knows a popup is up.
  useEffect(() => {
    document.documentElement.classList.toggle(LOCK_CLASS, open)
    setBodyFlag('overlay-open', 'guest-contact', open && !signingIn)
    return () => {
      document.documentElement.classList.remove(LOCK_CLASS)
      setBodyFlag('overlay-open', 'guest-contact', false)
    }
  }, [open, signingIn])

  // Escape does nothing and Tab stays inside the card; it cannot be left, only filled in.
  useEffect(() => {
    if (!open || signingIn) return undefined
    const onKey = event => {
      const card = cardRef.current
      if (!card) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (event.key !== 'Tab') return
      const items = [...card.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (!card.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, signingIn])

  // First field focused once it has appeared (not on phones: no keyboard jump).
  useEffect(() => {
    if (state === 'open' && !signingIn && window.matchMedia('(hover: hover)').matches) document.getElementById('guestName')?.focus({ preventScroll: true })
  }, [state, signingIn])

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
    setState(undefined)
    showToast(`Thank you, ${name.trim()}!`, 'success')
  }

  if (!state) return null

  const overlayClass = ['modal-overlay', state === 'opening' && 'is-opening', state === 'open' && !signingIn && 'active'].filter(Boolean).join(' ')
  return (
    <div className={overlayClass} id="guestContactModal">
      <div ref={cardRef} className="modal-card guest-card" role="dialog" aria-modal="true" aria-labelledby="guestTitle" aria-describedby="guestLead">
        <div className="guest-head">
          <span className="guest-badge" aria-hidden="true"><i className="fa-solid fa-seedling"></i></span>
          <h2 id="guestTitle" className="guest-title">Stay connected with us</h2>
          <p id="guestLead" className="guest-lead">Share your name and mobile number to continue browsing.</p>
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
          </div>
          <p className="guest-signin">
            <span>Already have an account?</span>{' '}
            <button type="button" className="auth-link" onClick={() => openSignIn()}>Sign In</button>
          </p>
          <p className="guest-privacy"><i className="fa-solid fa-lock" aria-hidden="true"></i> Saved only on this device. No messages are sent.</p>
        </form>
      </div>
    </div>
  )
}
