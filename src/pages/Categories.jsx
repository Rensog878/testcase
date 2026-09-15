import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search, X, ArrowLeft,
  Sparkles, CheckCircle2,
  ShieldCheck, PhoneCall
} from 'lucide-react'
import { CATEGORIES_DATA, DEFAULT_CATEGORY_HANDLE } from '../data/categoriesData'
import Navigation from '../components/home/Navigation'
import Footer from '../components/home/Footer'

// Every category is one section of the right-hand pane, one after another.
// The left rail follows the scroll (the category being read is highlighted and
// kept in view), and tapping a rail tab scrolls the pane to that category.
// ?ct= in the URL names the category, so links like Shop -> ?ct=Brands land on it.

const findCategory = handle => {
  const wanted = String(handle || '').toLowerCase()
  return (
    CATEGORIES_DATA.find(c => c.handle.toLowerCase() === wanted || c.name.toLowerCase() === wanted) ||
    CATEGORIES_DATA.find(c => c.handle === DEFAULT_CATEGORY_HANDLE) ||
    CATEGORIES_DATA[0]
  )
}

// A section counts as "being read" once its top is within this distance of
// the top of the pane.
const READING_LINE = 28

export default function Categories() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // URL category handle e.g. ?ct=AGRICULTURE%20EQUIPMENTS
  const ctParam = searchParams.get('ct') || DEFAULT_CATEGORY_HANDLE

  const [activeHandle, setActiveHandle] = useState(() => findCategory(ctParam).handle)
  const [searchQuery, setSearchQuery] = useState('')

  const paneRef = useRef(null)
  const railRef = useRef(null)
  const sectionEls = useRef({})
  const tabEls = useRef({})
  const activeRef = useRef(activeHandle)
  const writtenCt = useRef(null) // the ?ct= this page wrote itself
  const autoScrolling = useRef(false) // the pane is scrolling to a tapped category
  const releaseTimer = useRef(null)
  const spyFrame = useRef(0)

  const activeCategory = findCategory(activeHandle)

  // Phones: a full-screen view, so the document behind it does not scroll
  // (index.css, html.sb-fullscreen-page). Set before paint, removed on leaving.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('sb-fullscreen-page')
    window.scrollTo(0, 0)
    return () => root.classList.remove('sb-fullscreen-page')
  }, [])

  // The pane's sections: every category, narrowed by the search.
  const sections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return CATEGORIES_DATA.map(cat => {
      const all = cat.subMenus || []
      const total = all.reduce((sum, s) => sum + (s.items?.length || 0), 0)
      if (!q || cat.name.toLowerCase().includes(q)) return { cat, subMenus: all, total }
      const subMenus = all
        .map(sub => ({
          ...sub,
          items: sub.items.filter(item => item.title.toLowerCase().includes(q) || sub.name.toLowerCase().includes(q)),
        }))
        .filter(sub => sub.items.length > 0)
      return { cat, subMenus, total }
    }).filter(section => section.subMenus.length > 0)
  }, [searchQuery])

  const sectionsRef = useRef(sections)
  sectionsRef.current = sections

  const markActive = useCallback((handle, { writeUrl = true } = {}) => {
    if (!handle || handle === activeRef.current) return
    activeRef.current = handle
    setActiveHandle(handle)
    if (writeUrl) {
      writtenCt.current = handle
      setSearchParams({ ct: handle }, { replace: true })
    }
  }, [setSearchParams])

  const scrollPaneTo = useCallback((handle, behavior = 'smooth') => {
    const pane = paneRef.current
    const section = sectionEls.current[handle]
    if (!pane || !section) return
    const paddingTop = parseFloat(getComputedStyle(pane).paddingTop) || 0
    const top = Math.max(0, Math.min(
      section.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - paddingTop,
      pane.scrollHeight - pane.clientHeight,
    ))
    // Already there: nothing moves, so no scroll event would ever release the guard below.
    if (Math.abs(pane.scrollTop - top) < 2) return
    // While the pane moves to the chosen category, the sections it passes (or,
    // near the end, the last one) must not take over the highlight.
    autoScrolling.current = true
    clearTimeout(releaseTimer.current)
    releaseTimer.current = setTimeout(() => { autoScrolling.current = false }, behavior === 'smooth' ? 1200 : 150)
    pane.scrollTo({ top, behavior })
  }, [])

  // Which category is being read: the last section whose top has reached the
  // reading line, or the last one once the pane is scrolled to the end.
  const updateFromScroll = useCallback(() => {
    spyFrame.current = 0
    const pane = paneRef.current
    const list = sectionsRef.current
    if (!pane || !list.length) return
    const line = pane.getBoundingClientRect().top + (parseFloat(getComputedStyle(pane).paddingTop) || 0) + READING_LINE
    let current = list[0].cat.handle
    for (const { cat } of list) {
      const el = sectionEls.current[cat.handle]
      if (!el) continue
      if (el.getBoundingClientRect().top <= line) current = cat.handle
      else break
    }
    if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2) current = list[list.length - 1].cat.handle
    markActive(current)
  }, [markActive])

  const handlePaneScroll = () => {
    if (autoScrolling.current) {
      // Released shortly after the last scroll event of the glide.
      clearTimeout(releaseTimer.current)
      releaseTimer.current = setTimeout(() => { autoScrolling.current = false }, 120)
      return
    }
    if (!spyFrame.current) spyFrame.current = requestAnimationFrame(updateFromScroll)
  }

  useEffect(() => () => {
    clearTimeout(releaseTimer.current)
    cancelAnimationFrame(spyFrame.current)
  }, [])

  // Arriving with ?ct= (or following a link to another category while here):
  // jump straight to that category.
  useEffect(() => {
    const handle = findCategory(ctParam).handle
    if (handle === writtenCt.current) return
    writtenCt.current = handle
    markActive(handle, { writeUrl: false })
    scrollPaneTo(handle, 'auto')
  }, [ctParam, markActive, scrollPaneTo])

  // Keep the highlighted rail tab in view, centred in the rail.
  useEffect(() => {
    const rail = railRef.current
    const tab = tabEls.current[activeHandle]
    if (!rail || !tab) return
    // The rail runs under the bottom bar; that part does not count as visible.
    const hidden = parseFloat(getComputedStyle(rail).paddingBottom) || 0
    const visible = rail.clientHeight - hidden
    const railTop = rail.getBoundingClientRect().top
    const tabTop = tab.getBoundingClientRect().top - railTop
    if (tabTop >= 0 && tabTop + tab.offsetHeight <= visible) return
    rail.scrollTo({ top: rail.scrollTop + tabTop - (visible - tab.offsetHeight) / 2, behavior: 'smooth' })
  }, [activeHandle])

  // A new search starts from the top of the results. (Not on arrival: that
  // would undo the jump to the ?ct= category.)
  const lastQuery = useRef(searchQuery)
  useEffect(() => {
    if (lastQuery.current === searchQuery) return
    lastQuery.current = searchQuery
    const pane = paneRef.current
    if (!pane) return
    pane.scrollTop = 0
    if (sections.length) markActive(sections[0].cat.handle)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectCategory = handle => {
    markActive(handle)
    scrollPaneTo(handle)
  }

  return (
    <div className="bighaat-categories-page">
      {/* Desktop Navigation Header (Hidden on Mobile) */}
      <div className="desktop-only-nav">
        <Navigation />
      </div>

      {/* Mobile Top Header (BigHaat App Style - Visible only on Mobile) */}
      <header className="bighaat-mobile-header mobile-only-header">
        <div className="mobile-header-row">
          <button
            type="button"
            className="mobile-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go Back"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="mobile-header-title-box">
            <h1 className="mobile-header-title">Categories</h1>
            <span className="mobile-header-subtitle">Sathyam Bio Agro Hub</span>
          </div>
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => navigate('/')}
            aria-label="Home"
          >
            <X size={19} />
          </button>
        </div>

        {/* Mobile Search Bar inside header */}
        <div className="mobile-search-row">
          <div className="mobile-cat-search-bar">
            <Search size={16} className="search-icon-dim" />
            <input
              type="text"
              placeholder={searchQuery ? 'Search all categories...' : `Search in ${activeCategory?.name || 'Categories'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search categories"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                aria-label="Clear Search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Categories Layout Container */}
      <div className="bighaat-categories-wrapper">
        <div className="bighaat-split-container">

          {/* LEFT VERTICAL RAIL */}
          <aside className="bighaat-aside-rail" aria-label="Category Rail">
            <div className="aside-rail-scroll" ref={railRef}>
              {CATEGORIES_DATA.map((cat) => {
                const isActive = cat.handle === activeCategory?.handle
                return (
                  <button
                    key={cat.id || cat.handle}
                    ref={el => { tabEls.current[cat.handle] = el }}
                    type="button"
                    onClick={() => handleSelectCategory(cat.handle)}
                    className={`bighaat-rail-tab ${isActive ? 'active' : ''}`}
                    title={cat.name}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {/* Active vertical pill indicator */}
                    {isActive && <span className="active-pill-bar" />}

                    {/* Circular Icon Frame */}
                    <div className="rail-tab-circle">
                      <img
                        src={cat.icon}
                        alt={cat.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = 'https://media.bighaat.com/categories/Brands_icon.webp'
                        }}
                      />
                    </div>

                    {/* Label */}
                    <span className="rail-tab-label">
                      {cat.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* RIGHT PANE: every category, one after another (scrollable) */}
          <section
            id="bighaat-subcat-pane"
            className="bighaat-subcat-pane"
            aria-label="Subcategories"
            ref={paneRef}
            onScroll={handlePaneScroll}
          >
            {/* If search active and no results */}
            {sections.length === 0 && (
              <div className="no-subcat-results">
                <p>No subcategories found matching <strong>"{searchQuery}"</strong></p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="btn-clear-search"
                >
                  Clear Search
                </button>
              </div>
            )}

            {sections.map(({ cat, subMenus, total }) => (
              <div
                key={cat.id || cat.handle}
                ref={el => { sectionEls.current[cat.handle] = el }}
                className="subcat-category-section"
                data-handle={cat.handle}
              >
                {/* Category Header Banner */}
                <div className="subcat-banner-card">
                  <div className="subcat-banner-content">
                    <div className="subcat-banner-badge">
                      <Sparkles size={13} className="badge-sparkle" />
                      <span>Verified Sathyam Bio Quality</span>
                    </div>
                    <h2 className="subcat-banner-title">
                      {cat.name}
                    </h2>
                    <p className="subcat-banner-desc">
                      {/* One text node, so the page translator sees the whole sentence. */}
                      {`Explore ${total} verified agricultural ${cat.name.toLowerCase()} & field formulations.`}
                    </p>
                  </div>
                  <div className="subcat-banner-image">
                    <img
                      src={cat.icon}
                      alt={cat.name}
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Subcategory Groups (e.g. Implements, Agriculture Tools, Accessories, Irrigation) */}
                <div className="subcat-groups-stack">
                  {subMenus.map((sub, sIdx) => (
                    <div key={sub.name + sIdx} className="subcat-group-block">
                      {/* Group Title with BigHaat-style horizontal rule */}
                      <div className="subcat-group-header">
                        <h3 className="subcat-group-title">
                          {sub.name}
                        </h3>
                        <div className="subcat-group-line" />
                        <span className="subcat-group-count">
                          {sub.items.length} items
                        </span>
                      </div>

                      {/* 3-COLUMN GRID OF CIRCULAR TILES (Mobile UI) */}
                      <div className="subcat-circles-grid">
                        {sub.items.map((item, iIdx) => (
                          <Link
                            key={item.handle + iIdx}
                            to={`/products?category=${encodeURIComponent(item.title)}`}
                            className="subcat-circle-card"
                            title={item.title}
                          >
                            {/* 74px Round Image Container */}
                            <div className="subcat-circle-img-wrap">
                              <img
                                src={item.image}
                                alt={item.title}
                                loading="lazy"
                                onError={(e) => {
                                  e.target.onerror = null
                                  e.target.src = 'https://media.bighaat.com/categories/sprayers_ct.webp'
                                }}
                              />
                            </div>
                            {/* Title Underneath */}
                            <span className="subcat-circle-title">
                              {item.title}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Sathyam Bio Assurance Banner */}
            <div className="sathya-assurance-banner">
              <div className="assurance-item">
                <CheckCircle2 size={18} className="assurance-icon" />
                <div>
                  <strong>100% Genuine Agro Products</strong>
                  <small>Direct factory dispatch with batch warranty</small>
                </div>
              </div>
              <div className="assurance-item">
                <ShieldCheck size={18} className="assurance-icon" />
                <div>
                  <strong>COD & Online Payments</strong>
                  <small>UPI, NetBanking, Cards & Cash on Delivery</small>
                </div>
              </div>
              <div className="assurance-item">
                <PhoneCall size={18} className="assurance-icon" />
                <div>
                  <strong>Farmer Expert Helpline</strong>
                  <small>Toll Free 1800-425-9999 (Tamil, Telugu, Kannada, Hindi)</small>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Desktop Footer (Hidden on Mobile) */}
      <div className="desktop-only-footer">
        <Footer />
      </div>
    </div>
  )
}
