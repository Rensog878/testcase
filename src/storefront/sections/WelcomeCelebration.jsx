import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../../context/LanguageContext'
import { TEXT_PACKS } from '../i18n'
import { WELCOME_EVENT, takePendingWelcome } from '../welcome'
import './welcomeCelebration.css'

// A short, premium "welcome" moment after a farmer signs in: a seed ring
// draws itself, a sprout unfurls under a slow sunburst, light motes rise and
// the greeting lifts in word by word. Everything animates transform/opacity
// only, so it stays smooth on budget phones. It closes itself after a few
// seconds, or on tap / Escape / the button.

const SHOW_MS = 5200
const EXIT_MS = 520
const MOTES = 14

export default function WelcomeCelebration() {
  const { lang } = useLanguage()
  // English is the key in the language packs; the page translator is kept out
  // (.notranslate) because the title is split into per-word nodes.
  const t = text => TEXT_PACKS[lang]?.text?.[text] || text
  const [welcome, setWelcome] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])
  const buttonRef = useRef(null)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const close = () => {
    clearTimers()
    setLeaving(true)
    timers.current.push(setTimeout(() => {
      setWelcome(null)
      setLeaving(false)
    }, EXIT_MS))
  }

  const open = detail => {
    takePendingWelcome()
    clearTimers()
    setLeaving(false)
    setWelcome({ name: detail?.name || '', key: Date.now() })
  }

  useEffect(() => {
    const pending = takePendingWelcome()
    if (pending) open(pending)
    const onWelcome = event => open(event.detail)
    window.addEventListener(WELCOME_EVENT, onWelcome)
    return () => {
      window.removeEventListener(WELCOME_EVENT, onWelcome)
      clearTimers()
    }
  }, [])

  useEffect(() => {
    if (!welcome) return undefined
    timers.current.push(setTimeout(close, SHOW_MS))
    const focusTimer = setTimeout(() => buttonRef.current?.focus({ preventScroll: true }), 900)
    const onKey = event => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [welcome?.key])

  if (!welcome) return null

  const firstName = welcome.name.split(/\s+/)[0]
  const greeting = t('Welcome to Sathyam Bio').split(' ')

  return createPortal(
    <div
      key={welcome.key}
      className={`sbw notranslate${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sbwTitle"
      onClick={close}
    >
      <div className="sbw-backdrop" aria-hidden="true" />
      <div className="sbw-aurora" aria-hidden="true" />

      <div className="sbw-card" onClick={event => event.stopPropagation()}>
        <div className="sbw-emblem" aria-hidden="true">
          <div className="sbw-rays" />
          <div className="sbw-glow" />
          <svg className="sbw-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="sbwLeafA" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#1f7a3a" />
                <stop offset="1" stopColor="#8fdc5a" />
              </linearGradient>
              <linearGradient id="sbwLeafB" x1="1" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#15803d" />
                <stop offset="1" stopColor="#bef264" />
              </linearGradient>
              <linearGradient id="sbwRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fde68a" />
                <stop offset=".5" stopColor="#86efac" />
                <stop offset="1" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <circle className="sbw-ring" cx="60" cy="60" r="52" pathLength="1" />
            <circle className="sbw-ring-dash" cx="60" cy="60" r="44" pathLength="1" />
            <path className="sbw-soil" d="M34 88 Q60 80 86 88" pathLength="1" />
            <path className="sbw-stem" d="M60 88 C60 76 60 66 60 56" pathLength="1" />
            <g className="sbw-leaf sbw-leaf-l">
              <path d="M60 66 C46 66 36 56 34 42 C48 42 58 50 60 66 Z" fill="url(#sbwLeafA)" />
              <path d="M60 66 C52 58 44 51 36 44" className="sbw-vein" />
            </g>
            <g className="sbw-leaf sbw-leaf-r">
              <path d="M60 58 C74 58 86 48 88 32 C72 32 62 42 60 58 Z" fill="url(#sbwLeafB)" />
              <path d="M60 58 C68 50 78 41 86 34" className="sbw-vein" />
            </g>
            <circle className="sbw-dew" cx="80" cy="40" r="2.4" />
          </svg>
        </div>

        <div className="sbw-motes" aria-hidden="true">
          {Array.from({ length: MOTES }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${6 + i * 6.4}%`,
                '--s': `${3 + (i % 3) * 2}px`,
                animationDuration: `${3.2 + (i % 4) * 0.45}s`,
                animationDelay: `${0.6 + ((i * 7) % 10) * 0.12}s`,
              }}
            />
          ))}
        </div>

        <p className="sbw-eyebrow">
          <span className="sbw-eyebrow-line" />{t('Hello')}{firstName ? `, ${firstName}` : ''}<span className="sbw-eyebrow-line" />
        </p>
        <h2 className="sbw-title" id="sbwTitle">
          {greeting.map((word, i) => (
            <span key={i}>{i > 0 && ' '}<span className="sbw-word"><span style={{ '--w': i }}>{word}</span></span></span>
          ))}
        </h2>
        <p className="sbw-sub">{t('Healthy crops, happy harvests. We are glad you are here.')}</p>

        <button ref={buttonRef} type="button" className="sbw-cta" onClick={close}>
          <span>{t('Start exploring')}</span>
          <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </button>

        <div className="sbw-timer" aria-hidden="true"><span style={{ animationDuration: `${SHOW_MS}ms` }} /></div>
      </div>
    </div>,
    document.body
  )
}
