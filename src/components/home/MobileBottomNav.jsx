import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import TransitionLink from './TransitionLink'

// Phones: the bottom bar and its Menu sheet on every store page. App.jsx draws
// it once, outside the routes, so it stays mounted - the same element, icons
// and position - while the shopper moves between pages; nothing reloads or
// redraws. On the home page the Menu goes to the storefront's own sections,
// basket and sign-in (Storefront.jsx reads #basket, #account, ?category=...).
// Styles: index.css, "MOBILE MENU SHEET" and the floating bottom bar.

const CATEGORY_CHIPS = [
  ['Fungicide', 'Fungicides'],
  ['Insecticide', 'Insecticides'],
  ['Herbicide', 'Herbicides'],
  ['Bio-Stimulant', 'Bio-Stimulants'],
  ['Nematicide', 'Nematicides'],
]

// [storefront crop, All Products crop, label]
const CROP_CHIPS = [
  ['Paddy/Rice', 'Paddy', '🌾 Paddy / Rice'],
  ['Cotton', 'Cotton', '☁️ Cotton'],
  ['Tomato', 'Tomato', '🍅 Tomato'],
  ['Sugarcane', 'Sugarcane', '🎋 Sugarcane'],
  ['Grapes', 'Grapes', '🍇 Fruits'],
]

const STAFF_HOME = { admin: '/admin', employee: '/employee', delivery: '/delivery', billing: '/billing' }

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('sathya_user') || 'null')
  } catch {
    return null
  }
}

const countItems = items => (Array.isArray(items) ? items.reduce((acc, i) => acc + (Number(i.qty) || 1), 0) : 0)

const readGuestCount = () => {
  try {
    return countItems(JSON.parse(localStorage.getItem('sathya_cart_guest') || '[]'))
  } catch {
    return 0
  }
}

export default function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { lang, setLang, languages } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(readGuestCount)
  const [user, setUser] = useState(readUser)
  const sheetRef = useRef(null)

  const path = location.pathname
  const onHome = path === '/'
  const isShop = path === '/products' || path === '/categories' || path.startsWith('/product/')
  const isBlog = path === '/blog' || path.startsWith('/blog/')

  const closeMenu = () => setIsMenuOpen(false)

  // Any page change - another page, a section link or a filter - closes the menu.
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.key])

  // Basket count: the page that owns the basket announces changes (storefront,
  // checkout); otherwise the server basket, or this browser's guest basket.
  useEffect(() => {
    const onCount = event => setCartCount(Number(event.detail) || 0)
    window.addEventListener('sathya:cart-count', onCount)
    return () => window.removeEventListener('sathya:cart-count', onCount)
  }, [])

  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('sathya_token')
    if (!token) {
      setCartCount(readGuestCount())
      return undefined
    }
    fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (!cancelled && json?.success) setCartCount(countItems(json.data) + readGuestCount())
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [path])

  // The account text is read fresh each time the sheet opens.
  useEffect(() => {
    if (isMenuOpen) setUser(readUser())
  }, [isMenuOpen])

  // Closed, the sheet sits painted just below the screen: keep it out of focus
  // order, and back at the top for next time once the slide-out has finished.
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return undefined
    sheet.toggleAttribute('inert', !isMenuOpen)
    if (isMenuOpen) return undefined
    const timer = setTimeout(() => { sheet.scrollTop = 0 }, 450)
    return () => clearTimeout(timer)
  }, [isMenuOpen])

  // Escape closes it; so does rotating or resizing to the desktop layout.
  useEffect(() => {
    if (!isMenuOpen) return undefined
    const onKey = e => { if (e.key === 'Escape') setIsMenuOpen(false) }
    const desktop = window.matchMedia('(min-width: 769px)')
    const onResize = ev => { if (ev.matches) setIsMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    desktop.addEventListener?.('change', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      desktop.removeEventListener?.('change', onResize)
    }
  }, [isMenuOpen])

  // A downward swipe that starts with the sheet scrolled to the top closes it.
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return undefined
    let startX = 0
    let startY = 0
    let dy = 0
    let tracking = false
    let decided = false
    const reset = () => {
      sheet.style.removeProperty('transform')
      sheet.style.removeProperty('transition')
    }
    const onStart = e => {
      if (e.touches.length !== 1 || e.target.closest('select') || sheet.scrollTop > 0) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      dy = 0
      tracking = true
      decided = false
    }
    const onMove = e => {
      if (!tracking) return
      const moveX = e.touches[0].clientX - startX
      const moveY = e.touches[0].clientY - startY
      if (!decided) {
        if (Math.abs(moveX) < 6 && Math.abs(moveY) < 6) return
        decided = true
        // Sideways or upward is scrolling, not a dismiss.
        if (Math.abs(moveX) > Math.abs(moveY) || moveY < 0) {
          tracking = false
          return
        }
      }
      dy = Math.max(0, moveY)
      sheet.style.transition = 'none'
      sheet.style.transform = `translateY(${dy}px)`
    }
    const onEnd = () => {
      if (!tracking) return
      tracking = false
      reset()
      if (dy > 90) setIsMenuOpen(false)
    }
    sheet.addEventListener('touchstart', onStart, { passive: true })
    sheet.addEventListener('touchmove', onMove, { passive: true })
    sheet.addEventListener('touchend', onEnd)
    sheet.addEventListener('touchcancel', onEnd)
    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove', onMove)
      sheet.removeEventListener('touchend', onEnd)
      sheet.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  // Home while already on the home page returns to the top.
  const handleHomeClick = event => {
    closeMenu()
    if (!onHome) return
    event.preventDefault()
    if (location.hash || location.search) navigate('/')
    window.scrollTo(0, 0)
  }

  // The AI Leaf Doctor is the storefront's photo scanner.
  const openScanner = () => {
    closeMenu()
    navigate('/#scan')
  }

  const handleAccountClick = () => {
    closeMenu()
    if (onHome) {
      navigate('/#account')
      return
    }
    // Farmers sign in on the storefront; /login is the staff sign-in.
    navigate(user ? STAFF_HOME[user.role] || '/orders' : '/#login')
  }

  // On the home page a Menu tile goes to that section of the page.
  const homeOr = (section, elsewhere) => (onHome ? `/#${section}` : elsewhere)

  const accountSub = user
    ? [user.crop, user.village || user.district].filter(Boolean).join(' · ') || 'Signed in'
    : 'Sign in to track orders & get crop advice'

  return (
    <>
      <div className={`mobile-menu-backdrop ${isMenuOpen ? 'active' : ''}`} onClick={closeMenu} />

      <aside ref={sheetRef} className={`mobile-menu-sheet ${isMenuOpen ? 'active' : ''}`} aria-label="Menu" aria-hidden={!isMenuOpen}>
        <div className="mms-handle" aria-hidden="true"></div>

        <div className="mms-account">
          <div className="mms-avatar"><i className="fa-solid fa-user" aria-hidden="true"></i></div>
          <div className="mms-account-text">
            <strong>{user ? `Hi, ${user.name || 'Farmer'}` : 'Welcome to Sathya Bio'}</strong>
            <span>{accountSub}</span>
          </div>
          <button type="button" className="mms-account-btn" onClick={handleAccountClick}>
            {user ? 'My Account' : 'Sign In'}
          </button>
        </div>

        <h3 className="mms-title">Quick actions</h3>
        <div className="mms-grid">
          <TransitionLink to={homeOr('catalog', '/products')} className="mms-tile" onClick={closeMenu}>
            <span className="mms-tile-icon" style={{ '--tile': '#059669' }}><i className="fa-solid fa-store"></i></span>All Products
          </TransitionLink>
          <TransitionLink to={homeOr('categoriesSection', '/categories')} className="mms-tile" onClick={closeMenu}>
            <span className="mms-tile-icon" style={{ '--tile': '#0891b2' }}><i className="fa-solid fa-layer-group"></i></span>Categories
          </TransitionLink>
          <TransitionLink to={homeOr('cropSection', '/crops')} className="mms-tile" onClick={closeMenu}>
            <span className="mms-tile-icon" style={{ '--tile': '#65a30d' }}><i className="fa-solid fa-wheat-awn"></i></span>Shop by Crop
          </TransitionLink>
          <button type="button" className="mms-tile" onClick={openScanner}>
            <span className="mms-tile-icon" style={{ '--tile': '#d97706' }}><i className="fa-solid fa-camera-retro"></i></span>AI Leaf Doctor
          </button>
          <TransitionLink to="/blog" className="mms-tile" onClick={closeMenu}>
            <span className="mms-tile-icon" style={{ '--tile': '#7c3aed' }}><i className="fa-solid fa-book-open"></i></span>Blog
          </TransitionLink>
          <TransitionLink to={homeOr('basket', '/checkout')} className="mms-tile" onClick={closeMenu}>
            <span className="mms-tile-icon" style={{ '--tile': '#dc2626' }}><i className="fa-solid fa-bag-shopping"></i></span>My Cart
          </TransitionLink>
          <TransitionLink to="/orders" className="mms-tile" onClick={closeMenu}>
            <span className="mms-tile-icon" style={{ '--tile': '#2563eb' }}><i className="fa-solid fa-truck-fast"></i></span>Track Order
          </TransitionLink>
          <a href="https://wa.me/919442562423?text=Hello%20Sathya%20Bio%20Expert%2C%20I%20need%20crop%20advice" target="_blank" rel="noopener noreferrer" className="mms-tile" onClick={closeMenu}>
            <span className="mms-tile-icon" style={{ '--tile': '#16a34a' }}><i className="fa-brands fa-whatsapp"></i></span>WhatsApp Expert
          </a>
        </div>

        <h3 className="mms-title">Shop by category</h3>
        <div className="mms-chips">
          {CATEGORY_CHIPS.map(([value, label]) => (
            <TransitionLink
              key={value}
              to={onHome ? `/?category=${encodeURIComponent(value)}#catalog` : `/products?category=${encodeURIComponent(value)}`}
              className="mms-chip"
              onClick={closeMenu}
            >
              {label}
            </TransitionLink>
          ))}
        </div>

        <h3 className="mms-title">Shop by crop</h3>
        <div className="mms-chips">
          {CROP_CHIPS.map(([storeValue, productsValue, label]) => (
            <TransitionLink
              key={storeValue}
              to={onHome ? `/?crop=${encodeURIComponent(storeValue)}#catalog` : `/products?crop=${encodeURIComponent(productsValue)}`}
              className="mms-chip"
              onClick={closeMenu}
            >
              {label}
            </TransitionLink>
          ))}
        </div>

        <div className="mms-footer-row">
          <label className="mms-lang">
            <i className="fa-solid fa-globe" aria-hidden="true"></i>
            <select aria-label="Language" value={lang} onChange={e => setLang(e.target.value)}>
              {languages.map(language => (
                <option key={language.code} value={language.code}>{language.native}</option>
              ))}
            </select>
          </label>
          <a className="mms-call" href="tel:18004259999"><i className="fa-solid fa-phone-volume" aria-hidden="true"></i> 1800-425-9999</a>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR: Home | Shop | AI Doctor | Blogs | Menu.
          While the menu is open only the Menu tab (an X) is highlighted. */}
      <nav className="sathya-mobile-bottom-nav bighaat-mobile-bottom-nav" id="mobileBottomNav" aria-label="Mobile Navigation">
        <TransitionLink to="/" onClick={handleHomeClick} className={`mobile-nav-link ${onHome && !isMenuOpen ? 'active' : ''}`} aria-current={onHome ? 'page' : undefined}>
          <i className="fa-solid fa-house" aria-hidden="true"></i>
          <span>Home</span>
        </TransitionLink>

        {/* Shop opens the Brands section of Categories */}
        <TransitionLink to="/categories?ct=Brands" onClick={closeMenu} className={`mobile-nav-link ${isShop && !isMenuOpen ? 'active' : ''}`} aria-current={isShop ? 'page' : undefined}>
          <i className="fa-solid fa-store" aria-hidden="true"></i>
          <span>Shop</span>
        </TransitionLink>

        <button type="button" onClick={openScanner} className="mobile-nav-link mobile-nav-link-fab" aria-label="AI Leaf Doctor">
          <i className="fa-solid fa-camera-retro" aria-hidden="true"></i>
          <span>AI Doctor</span>
        </button>

        <TransitionLink to="/blog" onClick={closeMenu} className={`mobile-nav-link ${isBlog && !isMenuOpen ? 'active' : ''}`} aria-current={isBlog ? 'page' : undefined}>
          <i className="fa-solid fa-book-open" aria-hidden="true"></i>
          <span>Blogs</span>
        </TransitionLink>

        <button type="button" id="mobileNavMenu" onClick={() => setIsMenuOpen(open => !open)} className={`mobile-nav-link ${isMenuOpen ? 'active' : ''}`} aria-label="Menu" aria-expanded={isMenuOpen}>
          <i className={isMenuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} aria-hidden="true"></i>
          {cartCount > 0 && <span className="mobile-nav-badge">{cartCount}</span>}
          <span>Menu</span>
        </button>
      </nav>
    </>
  )
}
