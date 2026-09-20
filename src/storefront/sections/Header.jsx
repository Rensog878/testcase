import { memo, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../StoreContext'
import { CATEGORIES, CROPS, DISEASES, rupees } from '../data'
import { showToast } from '../toast'
import LanguageQuickSwitch from './LanguageQuickSwitch'
import { cmsText, cmsTickerLines } from '../../hooks/useCmsSettings'

export const TICKER_ITEMS = (
  <>
    <span className="ticker-item"><i className="fa-solid fa-fire" style={{ color: '#C77D18' }}></i> FLAT 15% OFF on first order — Use code <strong>FARM15</strong></span>
    <span className="ticker-item ticker-item--evergreen"><i className="fa-solid fa-truck-fast" style={{ color: '#3FBE86' }}></i> Free express delivery on orders above ₹999 across all 28 states</span>
    <span className="ticker-item"><i className="fa-solid fa-leaf" style={{ color: '#8FD9B6' }}></i> BlastShield 75 WP — #1 Selling Paddy Fungicide this Kharif Season</span>
    <span className="ticker-item"><i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }}></i> WhatsApp us at 9000-425-999 for instant crop advisory in your language</span>
    <span className="ticker-item"><i className="fa-solid fa-award" style={{ color: '#C77D18' }}></i> Sathyam Agro Mart — Winner of ICAR Best AgriTech 2025 Award</span>
    <span className="ticker-item ticker-item--evergreen"><i className="fa-solid fa-phone-volume" style={{ color: '#3FBE86' }}></i> Missed Call To Order: <strong>1800-425-9999</strong> — 24 hrs, 7 days</span>
  </>
)

// The promos an admin typed in the CMS, one per line. An empty field leaves the
// six built-in promos above exactly as they are, so the strip only changes once
// someone deliberately edits it.
function tickerItemsFor(cms) {
  const lines = cmsTickerLines(cms)
  if (!lines.length) return TICKER_ITEMS
  return (
    <>
      {lines.map((line, index) => (
        <span className="ticker-item ticker-item--cms" key={`${index}-${line}`}>
          <i className="fa-solid fa-bullhorn" style={{ color: '#C77D18' }}></i> {line}
        </span>
      ))}
    </>
  )
}

// Pixels per second the promo strip travels. Slow enough to read a long
// sentence as it passes, quick enough that the strip never looks stalled.
const TICKER_SPEED = 45

export const TickerBar = memo(function TickerBar({ cms }) {
  // The items are drawn twice so the scroll (translateX -50%) loops seamlessly.
  const items = tickerItemsFor(cms)
  const wrapRef = useRef(null)
  const copyRef = useRef(null)
  // The keyframes travel a fixed -50% in a fixed 38s, so the strip's speed used
  // to depend on how much the admin typed: one short CMS line crawled, six
  // built-in promos raced. One copy's width is exactly the distance travelled,
  // so timing it at a constant px/sec keeps the read the same either way.
  const [duration, setDuration] = useState(null)
  useEffect(() => {
    const copy = copyRef.current
    if (!copy || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => {
      const width = copy.getBoundingClientRect().width
      if (!width) return
      setDuration(Math.min(120, Math.max(10, width / TICKER_SPEED)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(copy)
    return () => observer.disconnect()
  }, [items])
  return (
    <div
      className="ticker-wrap"
      ref={wrapRef}
      style={duration ? { '--ticker-duration': `${duration.toFixed(1)}s` } : undefined}
    >
      <div className="ticker-track" id="tickerTrack">
        <span className="ticker-copy" ref={copyRef}>{items}</span>
        <span className="ticker-copy" aria-hidden="true">{items}</span>
      </div>
    </div>
  )
})

export const cropOf = user => user.crop || user.primaryCrop || 'All Crops'

export const Header = memo(function Header({ t, user, appliedLang, cartCount, cartTotal, searchText }) {
  const { setFilter, scrollToCatalog, handleAccountClick, handleBasketClick, goTo } = useStore()

  const onSearchKey = event => {
    // The keyboard's Search key takes the shopper to the results and closes
    // the on-screen keyboard.
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.currentTarget.blur()
    scrollToCatalog()
  }

  return (
    <header className="header-main">
      <div className="container header-grid">
        <a href="#" className="logo-box">
          <div className="logo-icon has-brand-mark"><img className="brand-mark" src="/assets/brand/logo-mark.png" alt="" width="512" height="512" /></div>
          <div>
            <div className="logo-text">SATHYAM <span>AGRO MART</span></div>
            <span className="logo-sub" data-i18n="logo_sub">{t('logo_sub')}</span>
          </div>
        </a>

        <div className="header-search">
          <input
            type="text"
            id="headerSearchInput"
            data-i18n-placeholder="search_placeholder"
            placeholder={t('search_placeholder')}
            aria-label="Search products"
            enterKeyHint="search"
            autoComplete="off"
            value={searchText}
            onChange={event => setFilter('search', event.target.value)}
            onKeyDown={onSearchKey}
          />
          <button type="button" className="voice-search-btn" title="Voice Search" aria-label="Voice search" onClick={() => showToast('Voice search is coming soon. For now, type a crop or disease name.', 'info')}>
            <i className="fa-solid fa-microphone"></i>
          </button>
          <button type="button" id="headerSearchBtn" aria-label="Search" onClick={scrollToCatalog}><i className="fa-solid fa-magnifying-glass"></i> <span data-i18n="search_btn">{t('search_btn')}</span></button>
        </div>

        <div className="header-actions">

          <div className="action-item action-track" onClick={() => goTo('/orders')} role="button" tabIndex={0}>
            <i className="fa-solid fa-truck-ramp-box action-icon"></i>
            <div>
              <span className="action-sub">Track</span>
              <span className="action-title">Order Status</span>
            </div>
          </div>

          {/* A real link, as on every other store page (Navigation.jsx). The
              inner markup is unchanged so tablets render exactly as before;
              the hard-coded "0" badge is not live data and is hidden at
              >=1025px. */}
          <Link to="/wishlist" className="action-item action-wishlist">
            <div className="action-icon">
              <i className="fa-regular fa-heart"></i>
              <span className="cart-badge" style={{ background: 'var(--accent-amber)' }}>0</span>
            </div>
            <div>
              <span className="action-sub">Saved</span>
              <span className="action-title">Wishlist</span>
            </div>
          </Link>

          {/* The store's only language control at every width now: the utility
              row that used to carry a <select> at >=1025px is gone. */}
          <LanguageQuickSwitch appliedLang={appliedLang} t={t} />

          <div className="action-item" id="headerAccountBtn" data-account-open onClick={handleAccountClick} style={{ cursor: 'pointer' }}>
            <i
              className={user ? 'fa-solid fa-circle-check action-icon' : 'fa-regular fa-circle-user action-icon'}
              id="headerAccountIcon"
              style={user ? { color: '#16A46A' } : undefined}
            ></i>
            <div>
              {user
                ? <span className="action-sub" id="headerAccountSub">{cropOf(user)}</span>
                : <span className="action-sub" id="headerAccountSub" data-i18n="advisory_label">{t('advisory_label')}</span>}
              <span className="action-title" id="headerAccountTitle">{user ? `${user.name ? user.name.split(' ')[0] : 'Farmer'} ▾` : 'Sign In / Register'}</span>
            </div>
          </div>

          <div className="action-item cart-trigger-btn" id="cartTrigger" data-checkout-open onClick={handleBasketClick} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
            <div className="action-icon">
              <i className="fa-solid fa-bag-shopping"></i>
              {/* No "0" on the header basket: the count shows only when it has items. */}
              <span className="cart-badge" id="cartBadge" style={cartCount ? undefined : { display: 'none' }}>{cartCount}</span>
            </div>
            <div>
              <span className="action-sub" data-i18n="basket_label">{t('basket_label')}</span>
              <span className="action-title" id="cartGrandTotal">{rupees(cartTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
})

export const NavBar = memo(function NavBar({ t }) {
  const { filterByCategory, filterByCrop, setFilter, scrollToCatalog } = useStore()
  // Desktop mega-menu. Opens on hover and on keyboard focus, closes on
  // Escape, on blur out of the panel and on choosing an entry. Hidden below
  // 1025px by CSS, where the phone Menu sheet (MobileBottomNav) already
  // covers the same ground - no phone markup or behaviour changes here.
  const [openMenu, setOpenMenu] = useState(null)
  const navRef = useRef(null)

  useEffect(() => {
    if (!openMenu) return
    const onKey = event => {
      if (event.key === 'Escape') {
        setOpenMenu(null)
        navRef.current?.querySelector(`[data-mega="${openMenu}"]`)?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openMenu])

  const close = () => setOpenMenu(null)
  // Focus leaving the whole nav closes the panel; moving between the trigger
  // and the links inside it does not.
  const onBlur = event => {
    if (!navRef.current?.contains(event.relatedTarget)) close()
  }

  // A real link, not a <button>: at 769-1024px (a restored/narrow desktop
  // window) the panel is CSS-hidden and every .nav-mega-trigger rule is
  // >=1025px only, so a button rendered as a bare native box that did nothing.
  const megaItem = (id, icon, label, fallbackTo, panel) => (
    <li
      className={`nav-mega${openMenu === id ? ' is-open' : ''}`}
      onMouseEnter={() => setOpenMenu(id)}
      onMouseLeave={close}
    >
      <Link
        to={fallbackTo}
        className="nav-mega-trigger"
        data-mega={id}
        aria-expanded={openMenu === id}
        aria-haspopup="true"
        onFocus={() => setOpenMenu(id)}
        onClick={close}
      >
        <i className={`fa-solid ${icon}`}></i> <span>{label}</span>
        <i className="fa-solid fa-chevron-down nav-mega-caret" aria-hidden="true"></i>
      </Link>
      <div className="nav-mega-panel" role="group" aria-label={label} hidden={openMenu !== id}>
        {panel}
      </div>
    </li>
  )

  return (
    <nav className="navbar" id="navbar" ref={navRef} onBlur={onBlur}>
      <div className="container nav-content">
        <ul className="nav-links" id="navLinks">
          <li><a href="#catalog" className="active"><i className="fa-solid fa-store"></i> <span data-i18n="nav_all_products">{t('nav_all_products')}</span></a></li>

          {megaItem('cat', 'fa-layer-group', 'Categories', '/categories', (
            <div className="nav-mega-cols">
              <div className="nav-mega-col">
                <p className="nav-mega-head">Shop by category</p>
                <ul>
                  {CATEGORIES.filter(value => value !== 'All').map(value => (
                    <li key={value}>
                      <button type="button" onClick={() => { filterByCategory(value); close() }}>{value}s</button>
                    </li>
                  ))}
                </ul>
                <Link className="nav-mega-all" to="/categories" onClick={close}>Browse full category directory <i className="fa-solid fa-arrow-right"></i></Link>
              </div>
              <div className="nav-mega-col nav-mega-col--wide">
                <p className="nav-mega-head">Shop by pest &amp; disease</p>
                <ul className="nav-mega-two-up">
                  {DISEASES.filter(item => item.id !== 'all').slice(0, 10).map(item => (
                    <li key={item.id}>
                      <button type="button" onClick={() => { setFilter('disease', item.id); scrollToCatalog(); close() }}>{item.name}</button>
                    </li>
                  ))}
                </ul>
                <a className="nav-mega-all" href="#catalog" onClick={close}>See the full catalogue <i className="fa-solid fa-arrow-right"></i></a>
              </div>
              {/* At >=1025px the bar keeps only the two mega-menu triggers, so
                  the three plain links it drops land here. The panel never
                  opens below 1025px (storefront.css tablet guard), so this
                  column is desktop-only by construction. */}
              <div className="nav-mega-col nav-mega-col--explore">
                <p className="nav-mega-head">Explore</p>
                <ul>
                  <li><a href="#catalog" onClick={close}><i className="fa-solid fa-store" aria-hidden="true"></i> <span data-i18n="nav_all_products">{t('nav_all_products')}</span></a></li>
                  <li><a href="#brandsSection" onClick={close}><i className="fa-solid fa-award" aria-hidden="true"></i> Brands</a></li>
                  <li><Link to="/blog" onClick={close}><i className="fa-solid fa-book-open" aria-hidden="true"></i> Blogs</Link></li>
                </ul>
              </div>
            </div>
          ))}

          {megaItem('crop', 'fa-wheat-awn', 'Shop by Crop', '/crops', (
            <div className="nav-mega-cols">
              <div className="nav-mega-col nav-mega-col--wide">
                <p className="nav-mega-head">Pick your crop</p>
                <ul className="nav-mega-two-up">
                  {CROPS.filter(crop => crop.id !== 'all').map(crop => (
                    <li key={crop.id}>
                      <button type="button" onClick={() => { filterByCrop(crop.id); close() }}>
                        <i className={`fa-solid ${crop.icon}`} aria-hidden="true"></i> {crop.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <a className="nav-mega-all" href="#cropSection" onClick={close}>All crops <i className="fa-solid fa-arrow-right"></i></a>
              </div>
            </div>
          ))}

          <li><a href="#brandsSection"><i className="fa-solid fa-award"></i> Brands</a></li>
          <li><Link to="/blog"><i className="fa-solid fa-book-open"></i> Blogs</Link></li>
        </ul>

        <div className="nav-actions">
          <button className="btn btn-gold nav-scan-btn" data-modal-target="photoScannerModal" title={t('nav_ai_scanner')}>
            <i className="fa-solid fa-camera-retro"></i> <span data-i18n="nav_ai_scanner">{t('nav_ai_scanner')}</span>
          </button>
        </div>
      </div>
    </nav>
  )
})
