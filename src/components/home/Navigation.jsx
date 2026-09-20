import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useCms } from '../../context/CmsContext'
import { useBasket, useCheckoutActions } from '../../hooks/useCheckout'
import { TickerBar, cropOf } from '../../storefront/sections/Header'
import LanguageQuickSwitch from '../../storefront/sections/LanguageQuickSwitch'
import { CATEGORIES, CROPS, DISEASES, rupees } from '../../storefront/data'

// The header/nav used on every storefront page except the home page itself
// (StoreLayout.jsx). Built from the SAME storefront.css classes as the home
// page's own Header/NavBar (storefront/sections/Header.jsx) - wrapped in
// .sb-portal, which is storefront.css's built-in escape hatch for reusing its
// (otherwise home-page-scoped) styles elsewhere - so the two headers look and
// behave identically. The home components themselves aren't reused directly:
// they read basket/account/catalog-filter actions off StoreContext, which
// only Storefront.jsx provides; here the same actions are implemented with
// this app's normal global hooks (useAuth, useLanguage, useCheckout) and
// react-router navigation to /products (?category=/?crop=/?disease=/?search=,
// all read by AllProducts.jsx) instead of an in-page filter + scroll.
export default function Navigation() {
  const { user } = useAuth()
  const { lang, setLang, t } = useLanguage()
  // Same CMS state the home page reads (one provider for the whole app), so
  // promos typed in Admin -> CMS run on every store page, not just home.
  const { cms } = useCms()
  const { count, totals } = useBasket()
  const { openBasket, showAccount } = useCheckoutActions()
  const navigate = useNavigate()

  const location = useLocation()
  // This box and the catalogue's own search box are one filter with two faces,
  // so the URL is what both show. Without this the term typed up here stayed
  // behind after the catalogue cleared it - a category tile replacing it, or
  // the shopper emptying the box down there - and kept sitting in the header
  // looking like it was still narrowing the results.
  const urlSearch = location.pathname === '/products'
    ? (new URLSearchParams(location.search).get('search') || '')
    : ''
  const [searchText, setSearchText] = useState(urlSearch)
  useEffect(() => { setSearchText(urlSearch) }, [urlSearch])
  const [openMenu, setOpenMenu] = useState(null)

  const goProducts = params => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v))
    const s = qs.toString()
    navigate(s ? `/products?${s}` : '/products')
  }
  const runSearch = () => goProducts({ search: searchText })

  const close = () => setOpenMenu(null)
  // `fallbackTo` is where the trigger itself navigates. The mega panel opens
  // on hover/focus for desktop pointers, so a click is only ever the second
  // step of that (panel already open, navigating on is fine) - except
  // between 769-1024px (tablet, and "desktop site" mode on phones), where
  // storefront.css force-hides the panel and there's no hover. Without a
  // real href here, the trigger was a dead button with no way to reach the
  // category/crop pages at all in that range.
  const megaItem = (id, icon, label, fallbackTo, panel) => (
    <li
      className={`nav-mega${openMenu === id ? ' is-open' : ''}`}
      onMouseEnter={() => setOpenMenu(id)}
      onMouseLeave={close}
    >
      <Link
        to={fallbackTo}
        className="nav-mega-trigger"
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
    <div className="sb-portal">
      {/* Two shells, so the four chrome rows can collapse into two at
          >=1025px, exactly like the home page (Storefront.jsx) - same
          classes, same storefront.css rules, so this header renders
          pixel-identical to it. Both are `display: contents` below that. */}
      <div className="sb-utility-shell">
        <TickerBar cms={cms} />

      </div>

      <div className="sb-header-shell">
      <header className="header-main">
        <div className="container header-grid">
          <Link to="/" className="logo-box">
            <div className="logo-icon has-brand-mark"><img className="brand-mark" src="/assets/brand/logo-mark.png" alt="" width="512" height="512" /></div>
            <div>
              <div className="logo-text">SATHYAM <span>AGRO MART</span></div>
              <span className="logo-sub">From our farms to your home</span>
            </div>
          </Link>

          <div className="header-search">
            <input
              type="text"
              placeholder="Search by crop, disease or chemical"
              aria-label="Search products"
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); runSearch() } }}
            />
            <button type="button" id="headerSearchBtn" aria-label="Search" onClick={runSearch}><i className="fa-solid fa-magnifying-glass"></i> <span>Search</span></button>
          </div>

          <div className="header-actions">
            <Link to="/orders" className="action-item action-track">
              <i className="fa-solid fa-truck-ramp-box action-icon"></i>
              <div><span className="action-sub">Track</span><span className="action-title">Order Status</span></div>
            </Link>

            <Link to="/wishlist" className="action-item action-wishlist">
              <div className="action-icon"><i className="fa-regular fa-heart"></i></div>
              <div><span className="action-sub">Saved</span><span className="action-title">Wishlist</span></div>
            </Link>

            {/* Desktop only. Below 1025px a store page is drawn inside the
                shared phone/tablet chrome (StoreTopChrome), which carries its
                own language control; a second one here changed the tablet
                header, which has to render exactly as before. */}
            <span className="header-lang-slot">
              <LanguageQuickSwitch appliedLang={lang} t={t} onSelect={setLang} />
            </span>

            <div className="action-item" onClick={showAccount} style={{ cursor: 'pointer' }}>
              <i
                className={user ? 'fa-solid fa-circle-check action-icon' : 'fa-regular fa-circle-user action-icon'}
                style={user ? { color: '#16A46A' } : undefined}
              ></i>
              <div>
                {user ? <span className="action-sub">{cropOf(user)}</span> : <span className="action-sub">Account</span>}
                <span className="action-title">{user ? `${user.name ? user.name.split(' ')[0] : 'Farmer'} ▾` : 'Sign In / Register'}</span>
              </div>
            </div>

            <div className="action-item cart-trigger-btn" onClick={openBasket} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
              <div className="action-icon">
                <i className="fa-solid fa-bag-shopping"></i>
                <span className="cart-badge" style={count ? undefined : { display: 'none' }}>{count}</span>
              </div>
              <div><span className="action-sub">Basket</span><span className="action-title">{rupees(totals.total)}</span></div>
            </div>
          </div>
        </div>
      </header>

      <nav className="navbar" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close() }}>
        <div className="container nav-content">
          <ul className="nav-links">
            <li><Link to="/products"><i className="fa-solid fa-store"></i> <span>All Products</span></Link></li>

            {megaItem('cat', 'fa-layer-group', 'Categories', '/categories', (
              <div className="nav-mega-cols">
                <div className="nav-mega-col">
                  <p className="nav-mega-head">Shop by category</p>
                  <ul>
                    {CATEGORIES.filter(value => value !== 'All').map(value => (
                      <li key={value}><button type="button" onClick={() => { goProducts({ category: value }); close() }}>{value}s</button></li>
                    ))}
                  </ul>
                  <Link className="nav-mega-all" to="/categories" onClick={close}>Browse full category directory <i className="fa-solid fa-arrow-right"></i></Link>
                </div>
                <div className="nav-mega-col nav-mega-col--wide">
                  <p className="nav-mega-head">Shop by pest &amp; disease</p>
                  <ul className="nav-mega-two-up">
                    {DISEASES.filter(item => item.id !== 'all').slice(0, 10).map(item => (
                      <li key={item.id}><button type="button" onClick={() => { goProducts({ disease: item.id }); close() }}>{item.name}</button></li>
                    ))}
                  </ul>
                  <Link className="nav-mega-all" to="/products" onClick={close}>See the full catalogue <i className="fa-solid fa-arrow-right"></i></Link>
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
                        <button type="button" onClick={() => { goProducts({ crop: crop.id }); close() }}>
                          <i className={`fa-solid ${crop.icon}`} aria-hidden="true"></i> {crop.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Link className="nav-mega-all" to="/crops" onClick={close}>All crops <i className="fa-solid fa-arrow-right"></i></Link>
                </div>
              </div>
            ))}

            <li><Link to="/brands"><i className="fa-solid fa-award"></i> Brands</Link></li>
            <li><Link to="/blog"><i className="fa-solid fa-book-open"></i> Blogs</Link></li>
          </ul>

          <div className="nav-actions">
            <Link className="btn btn-gold nav-scan-btn" to="/#scan">
              <i className="fa-solid fa-camera-retro"></i> <span>AI Leaf Doctor</span>
            </Link>
          </div>
        </div>
      </nav>
      </div>
    </div>
  )
}
