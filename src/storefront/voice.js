// Voice typing for the store's input fields, with the browser's own speech
// recognition (Chrome / Edge / Samsung Internet on Android and desktop, Safari
// on iPhone). No library and no server of ours: the browser sends the audio to
// its own service, so it needs internet. Firefox has none; the mic is hidden.
// The button is sections/VoiceButton.jsx; styles: storefront.css, "7n. VOICE TYPING".

import { useEffect, useRef, useState } from 'react'
import { showToast } from './toast'

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
export const voiceSupported = Boolean(Recognition)

import { endPunctuationless } from '../shared/voiceText'

export { speechLang } from '../shared/voiceText'

// Puts text into a React-controlled input as if typed, so the form's own
// onChange, formatting and checks run exactly as they do for the keyboard.
export function fillInput(el, text) {
  if (!el) return
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const limit = el.maxLength > 0 ? el.maxLength : Infinity
  // Speech services end a phrase with a full stop ("Apple."); a one-line field
  // (a name, a village, a search) never wants it. Text areas keep sentences.
  const clean = el instanceof HTMLTextAreaElement ? String(text) : endPunctuationless(text)
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, clean.slice(0, limit))
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

// useVoiceInput({ lang, onResult, onInterim }) -> { listening, toggle }.
// onResult gets the final transcript once the speaker stops. onInterim, when
// given, gets the words so far while they are still speaking, so the field
// fills in live instead of all at once at the end.
export function useVoiceInput({ lang, onResult, onInterim }) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const resultRef = useRef(onResult)
  resultRef.current = onResult
  const interimRef = useRef(onInterim)
  interimRef.current = onInterim

  useEffect(() => () => { recRef.current?.abort() }, [])

  const stop = () => recRef.current?.stop()

  const start = () => {
    if (!Recognition) return
    if (active && active !== recRef) active.current?.abort()
    const rec = new Recognition()
    rec.lang = lang
    rec.interimResults = Boolean(interimRef.current)
    rec.continuous = false
    rec.maxAlternatives = 1
    let heard = ''
    rec.onresult = event => {
      const all = [...event.results]
      heard = all.filter(result => result.isFinal).map(result => result[0].transcript).join(' ').trim()
      const sofar = all.map(result => result[0].transcript).join(' ').trim()
      if (interimRef.current && sofar) interimRef.current(sofar)
      // Some phones never mark the last phrase final before `end`.
      rec.lastHeard = sofar
    }
    rec.onerror = event => {
      if (event.error === 'aborted') return
      showToast(ERRORS[event.error] || 'Voice typing stopped. Please try again.', event.error === 'no-speech' ? 'info' : 'error')
    }
    rec.onend = () => {
      setListening(false)
      if (active === recRef) active = null
      if (recRef.current === rec) recRef.current = null
      const final = heard || rec.lastHeard || ''
      if (final) resultRef.current(final)
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
