import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../StoreContext'
import { LANGUAGES, isLanguageReady } from '../i18n'

const firstSoonIndex = LANGUAGES.findIndex(language => !isLanguageReady(language.code))

// The header's language control: a small menu of languages. `onSelect` lets a
// header outside StoreContext (components/home/Navigation.jsx, which runs on
// the app's own LanguageContext) use the same control instead of a second
// implementation of it.
export default function LanguageQuickSwitch({ appliedLang, t, onSelect }) {
  const store = useStore()
  const changeLanguage = onSelect || store?.changeLanguage
  const [menuTop, setMenuTop] = useState(null) // null while closed
  const [menuRight, setMenuRight] = useState(12)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const open = menuTop !== null
  const current = LANGUAGES.find(language => language.code === appliedLang) || LANGUAGES[0]

  const close = ({ restoreFocus = true } = {}) => {
    setMenuTop(null)
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!open || !menuRef.current) return undefined
    const options = () => [...menuRef.current.querySelectorAll('.lang-quick-option:not(:disabled)')]
    ;(menuRef.current.querySelector('[aria-checked="true"]') || options()[0])?.focus({ preventScroll: true })

    const onKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const list = options()
        const at = list.indexOf(document.activeElement)
        const next = event.key === 'ArrowDown' ? (at + 1) % list.length : (at - 1 + list.length) % list.length
        list[next]?.focus()
      }
    }
    const onResize = () => close({ restoreFocus: false })
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const toggle = () => {
    if (open) close()
    else {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuTop(Math.round(rect.bottom + 8))
      // The menu is pinned to the viewport's right edge (phones, where the
      // control sits in that corner). In the desktop header it sits mid-row,
      // so the distance to the button's own right edge is published as a
      // custom property; only the >=1025px rule reads it.
      setMenuRight(Math.max(12, Math.round(window.innerWidth - rect.right)))
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="lang-quick-btn notranslate"
        id="langQuickBtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="langQuickMenu"
        aria-label={`Language: ${current.english}`}
        onClick={toggle}
      >
        <i className="fa-solid fa-language" aria-hidden="true"></i>
        <span className="lang-quick-code" id="langQuickCode">{appliedLang === 'en' ? 'EN' : current.glyph}</span>
      </button>

      {/* Drawn inside the page wrapper (#top), where the storefront styles apply. */}
      {open && createPortal(
        <>
          <div className="lang-quick-backdrop" onClick={() => close()} />
          <div ref={menuRef} id="langQuickMenu" className="lang-quick-menu notranslate" role="menu" aria-label="Choose language" style={{ top: `${menuTop}px`, '--lang-menu-right': `${menuRight}px` }}>
            {/* In the current language, with "Language" alongside for anyone who cannot read it. */}
            <div className="lang-quick-title">{appliedLang === 'en' ? 'Language' : `${t('lang_label')} · Language`}</div>
            {LANGUAGES.map((language, index) => {
              const ready = isLanguageReady(language.code)
              return (
                <Fragment key={language.code}>
                  {index === firstSoonIndex && <div className="lang-quick-divider" />}
                  <button
                    type="button"
                    className="lang-quick-option"
                    data-lang={language.code}
                    disabled={!ready}
                    role="menuitemradio"
                    aria-checked={language.code === appliedLang}
                    onClick={() => {
                      close()
                      changeLanguage(language.code)
                    }}
                  >
                    <span className="lang-quick-glyph" aria-hidden="true">{language.glyph}</span>
                    <span className="lang-quick-names"><strong>{language.native}</strong><small>{language.english}</small></span>
                    {ready
                      ? <i className="fa-solid fa-check lang-quick-check" aria-hidden="true"></i>
                      : <span className="lang-quick-soon">Coming soon</span>}
                  </button>
                </Fragment>
              )
            })}
          </div>
        </>,
        document.getElementById('top') || document.body,
      )}
    </>
  )
}
