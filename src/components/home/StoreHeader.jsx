import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useBasket, useCheckoutActions } from '../../hooks/useCheckout'
import { STAFF_HOME } from '../../hooks/checkoutRules'
import TransitionLink from './TransitionLink'

// Phones: the header row - logo, language, account, basket - drawn once above
// every store page (StoreTopChrome in App.jsx), so it stays in place between
// pages. The basket opens the floating checkout over the page
// (hooks/useCheckout.js); on the home page account opens the sign-in card
// (#account).
// Styles: index.css, "STORE HEADER ROW".
const LANGS = [
  { code: 'en', pill: 'EN', native: 'English', english: 'English', ready: true },
  { code: 'ta', pill: 'த', native: 'தமிழ்', english: 'Tamil', ready: true },
  { code: 'kn', pill: 'ಕ', native: 'ಕನ್ನಡ', english: 'Kannada', ready: true },
  { code: 'te', pill: 'తె', native: 'తెలుగు', english: 'Telugu', ready: true },
  { code: 'hi', pill: 'हि', native: 'हिन्दी', english: 'Hindi', ready: true },
  { code: 'ml', pill: 'മ', native: 'മലയാളം', english: 'Malayalam', ready: false },
]

export default function StoreHeader() {
  const { lang, setLang } = useLanguage()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const { count } = useBasket()
  const { openBasket } = useCheckoutActions()
  const onHome = pathname === '/'
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuTop, setMenuTop] = useState(0)
  const langButton = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = event => { if (event.key === 'Escape') setMenuOpen(false) }
    const onResize = () => setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const current = LANGS.find(item => item.code === lang) || LANGS[0]
  let accountHref = !user ? '/#login' : (STAFF_HOME[user.role] || '/orders')
  if (onHome) accountHref = '/#account'

  const toggleMenu = () => {
    if (!menuOpen && langButton.current) setMenuTop(Math.round(langButton.current.getBoundingClientRect().bottom + 8))
    setMenuOpen(open => !open)
  }

  const chooseLanguage = code => {
    setMenuOpen(false)
    setLang(code) // saved under the storefront's key too
  }

  return (
    <header className="sb-store-head">
      <div className="sb-store-head-row">
        <TransitionLink to="/" className="sb-store-logo">
          <span className="sb-store-logo-icon"><i className="fa-solid fa-leaf" aria-hidden="true"></i></span>
          <span className="sb-store-logo-words">
            <span className="sb-store-logo-text">SATHYA <span>BIO</span></span>
            <span className="sb-store-logo-sub">Agro Pesticide Store</span>
          </span>
        </TransitionLink>

        <div className="sb-store-head-actions">
          <button
            ref={langButton}
            type="button"
            className="sb-store-lang notranslate"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Language: ${current.english}`}
            onClick={toggleMenu}
          >
            <i className="fa-solid fa-language" aria-hidden="true"></i>
            <span>{current.pill}</span>
          </button>

          <TransitionLink to={accountHref} className="sb-store-action" aria-label={user ? 'My account' : 'Sign in'}>
            <i className={user ? 'fa-solid fa-circle-check sb-store-signed-in' : 'fa-regular fa-circle-user'} aria-hidden="true"></i>
          </TransitionLink>

          <a href="#basket" className="sb-store-action" data-checkout-open onClick={openBasket} aria-label={count ? `Basket, ${count} items` : 'Basket'}>
            <i className="fa-solid fa-bag-shopping" aria-hidden="true"></i>
            {count > 0 && <span className="sb-store-badge">{count}</span>}
          </a>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="sb-lang-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="sb-lang-menu notranslate" role="menu" aria-label="Choose language" style={{ top: menuTop }}>
            <div className="sb-lang-title">Language</div>
            {LANGS.map(item => (
              <button
                key={item.code}
                type="button"
                role="menuitemradio"
                aria-checked={item.code === current.code}
                disabled={!item.ready}
                className="sb-lang-option"
                onClick={() => chooseLanguage(item.code)}
              >
                <span className="sb-lang-glyph" aria-hidden="true">{item.pill}</span>
                <span className="sb-lang-names"><strong>{item.native}</strong><small>{item.english}</small></span>
                {item.ready
                  ? <i className="fa-solid fa-check sb-lang-check" aria-hidden="true"></i>
                  : <span className="sb-lang-soon">Coming soon</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </header>
  )
}
