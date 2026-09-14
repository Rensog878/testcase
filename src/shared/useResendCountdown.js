import { createElement, useEffect, useRef, useState } from 'react'

// The countdown before an OTP can be sent again. The server picks each wait
// (30-60s per send, longer once an hourly limit is reached) and enforces it;
// this only shows it. It counts to a deadline rather than counting ticks:
// timers slow down or stop in a background tab or on a locked phone, and a
// tick count would then show more time left than there is.

// No usable number from the server: assume its longest resend wait. Showing a
// longer wait than the server's only delays a resend; a shorter one gets refused.
export const RESEND_FALLBACK_SECONDS = 60
// The hourly send limits can ask for up to an hour.
const MAX_WAIT_SECONDS = 60 * 60
const TICK_MS = 250

// Language packs translate these exact wordings (public/js/lang-*.js).
const CODE_SENT = 'Code sent on WhatsApp.'
const RESEND_READY = 'You can resend the code now.'

export function resendWaitSeconds(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return RESEND_FALLBACK_SECONDS
  return Math.min(MAX_WAIT_SECONDS, Math.max(1, Math.ceil(seconds)))
}

export function resendLabel(secondsLeft) {
  // An hourly limit: "Resend in 3412s" means nothing to anyone.
  if (secondsLeft > 60) return `Try again in ${Math.ceil(secondsLeft / 60)} min`
  if (secondsLeft > 0) return `Resend in ${secondsLeft}s`
  return 'Resend code'
}

const waitMessage = seconds => (seconds > 60
  ? `Try again in ${Math.ceil(seconds / 60)} min.`
  : `Please wait ${seconds} seconds before requesting another code.`)

// The timing on its own, so it can be tested with fake timers. onTick gets the
// whole seconds left whenever that number changes (null once cleared); onDone
// runs once each time the countdown reaches 0.
export function createResendCountdown({ onTick, onDone }) {
  let deadline = 0
  let shown = null
  let timer = null

  const halt = () => {
    clearInterval(timer)
    timer = null
    globalThis.document?.removeEventListener('visibilitychange', tick)
  }

  function tick() {
    const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (left === 0) halt()
    if (left === shown) return
    shown = left
    onTick(left)
    if (left === 0) onDone?.()
  }

  return {
    // Replaces any countdown already running.
    start(seconds) {
      halt()
      deadline = Date.now() + resendWaitSeconds(seconds) * 1000
      shown = null
      timer = setInterval(tick, TICK_MS)
      // Back in the tab: the right number straight away, not a tick later.
      globalThis.document?.addEventListener('visibilitychange', tick)
      tick()
    },
    // Back to "no code sent".
    clear() {
      halt()
      shown = null
      onTick(null)
    },
    halt,
  }
}

// secondsLeft is null before any code is sent, then the seconds left (0 = the
// code can be sent again). start(seconds) takes the server's resendAfter; pass
// { sent: false } with a 429's retryAfter, where no code went out.
export function useResendCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [announcement, setAnnouncement] = useState(null)
  const api = useRef(null)

  if (!api.current) {
    // A new id each time, so the same words said twice are read out twice.
    const announce = text => setAnnouncement(previous => ({ text, id: (previous?.id ?? 0) + 1 }))
    const countdown = createResendCountdown({ onTick: setSecondsLeft, onDone: () => announce(RESEND_READY) })
    api.current = {
      start: (seconds, { sent = true } = {}) => {
        countdown.start(seconds)
        announce(sent ? CODE_SENT : waitMessage(resendWaitSeconds(seconds)))
      },
      clear: countdown.clear,
      halt: countdown.halt,
    }
  }

  useEffect(() => api.current.halt, [])

  const { start, clear } = api.current
  return { secondsLeft, waiting: secondsLeft !== 0, start, clear, announcement }
}

const VISUALLY_HIDDEN = { position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }

// Screen readers hear "code sent" and "you can resend" once each, not every
// second of the countdown. Render it before any code is sent: text that
// arrives together with its live region is often not read out.
export function ResendAnnouncer({ announcement }) {
  return createElement(
    'span',
    { 'aria-live': 'polite', style: VISUALLY_HIDDEN },
    announcement ? createElement('span', { key: announcement.id }, announcement.text) : null,
  )
}
