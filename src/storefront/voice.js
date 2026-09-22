// Voice typing for the store's input fields, with the browser's own speech
// recognition (Chrome / Edge / Samsung Internet on Android and desktop, Safari
// on iPhone). No library and no server of ours: the browser sends the audio to
// its own service, so it needs internet. Firefox has none; the mic is hidden.
// The button is sections/VoiceButton.jsx; styles: storefront.css, "7n. VOICE TYPING".

import { useEffect, useRef, useState } from 'react'
import { showToast } from './toast'

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
export const voiceSupported = Boolean(Recognition)

// Which language to listen in: 'text' follows the site (Tamil or English),
// 'latin' (addresses) and 'digits' (mobile, PIN) always English, so couriers
// can read the address and a number comes out as digits.
export const speechLang = (mode, siteLang) => (mode === 'text' && siteLang === 'ta' ? 'ta-IN' : 'en-IN')

const WORD_DIGITS = { zero: '0', oh: '0', o: '0', one: '1', two: '2', to: '2', too: '2', three: '3', four: '4', for: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9' }
const REPEAT = { double: 2, triple: 3 }

// "nine eight double seven 6 5" -> "987765". Keeps only digits.
export function spokenDigits(text) {
  const words = String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  let out = ''
  let repeat = 1
  for (const word of words) {
    if (REPEAT[word]) { repeat = REPEAT[word]; continue }
    const digits = /^\d+$/.test(word) ? word : WORD_DIGITS[word]
    if (!digits) continue
    out += digits.length === 1 ? digits.repeat(repeat) : digits
    repeat = 1
  }
  return out
}

// Puts text into a React-controlled input as if typed, so the form's own
// onChange, formatting and checks run exactly as they do for the keyboard.
export function fillInput(el, text) {
  if (!el) return
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const limit = el.maxLength > 0 ? el.maxLength : Infinity
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(text).slice(0, limit))
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

const ERRORS = {
  'not-allowed': 'Please allow microphone access for this site in your browser settings, then tap the mic again.',
  'service-not-allowed': 'Please allow microphone access for this site in your browser settings, then tap the mic again.',
  'audio-capture': 'No microphone was found on this device.',
  network: 'Voice typing needs an internet connection. Please try again.',
  'no-speech': "We didn't hear anything. Tap the mic and speak.",
  'language-not-supported': 'Voice typing in this language is not available on this device.',
}

// One recognition at a time on the page: starting another stops this one.
let active = null

// useVoiceInput({ lang, onResult }) -> { listening, toggle }. onResult gets the
// final transcript once the speaker stops.
export function useVoiceInput({ lang, onResult }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const resultRef = useRef(onResult)
  resultRef.current = onResult

  useEffect(() => () => { recRef.current?.abort() }, [])

  const stop = () => recRef.current?.stop()

  const start = () => {
    if (!Recognition) return
    if (active && active !== recRef) active.current?.abort()
    const rec = new Recognition()
    rec.lang = lang
    rec.interimResults = false
    rec.continuous = false
    rec.maxAlternatives = 1
    let heard = ''
    rec.onresult = event => {
      heard = [...event.results].map(result => result[0].transcript).join(' ').trim()
    }
    rec.onerror = event => {
      if (event.error === 'aborted') return
      showToast(ERRORS[event.error] || 'Voice typing stopped. Please try again.', event.error === 'no-speech' ? 'info' : 'error')
    }
    rec.onend = () => {
      setListening(false)
      if (active === recRef) active = null
      if (recRef.current === rec) recRef.current = null
      if (heard) resultRef.current(heard)
    }
    recRef.current = rec
    active = recRef
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  return { listening, toggle: () => (listening ? stop() : start()) }
}
