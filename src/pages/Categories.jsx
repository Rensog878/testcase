import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { 
  Search, X, ArrowLeft, Grid, Home, Truck, 
  Leaf, ShoppingBag, Sparkles, CheckCircle2, 
  ShieldCheck, PhoneCall
} from 'lucide-react'
import { CATEGORIES_DATA, DEFAULT_CATEGORY_HANDLE } from '../data/categoriesData'
import Navigation from '../components/home/Navigation'
import Footer from '../components/home/Footer'
import StoreHeader from '../components/home/StoreHeader'

export default function Categories() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // URL category handle e.g. ?ct=AGRICULTURE%20EQUIPMENTS
  const ctParam = searchParams.get('ct') || DEFAULT_CATEGORY_HANDLE
  
  // State for active category
  const [activeHandle, setActiveHandle] = useState(ctParam)
  const [searchQuery, setSearchQuery] = useState('')

  // Sync state with URL parameter if it changes
  useEffect(() => {
    if (searchParams.get('ct')) {
      setActiveHandle(searchParams.get('ct'))
    }
  }, [searchParams])

  // Get active category object
  const activeCategory = useMemo(() => {
    const found = CATEGORIES_DATA.find(
      c => c.handle.toLowerCase() === activeHandle.toLowerCase() || 
           c.name.toLowerCase() === activeHandle.toLowerCase()
    )
    return found || CATEGORIES_DATA.find(c => c.handle === DEFAULT_CATEGORY_HANDLE) || CATEGORIES_DATA[0]
  }, [activeHandle])

  // Switch category and update URL parameter smoothly
  const handleSelectCategory = (handle) => {
    setActiveHandle(handle)
    setSearchParams({ ct: handle })
    setSearchQuery('')
    // Scroll right pane back to top
    const contentPane = document.getElementById('bighaat-subcat-pane')
    if (contentPane) contentPane.scrollTop = 0
  }

  // Filter subcategory items based on search input
  const filteredSubMenus = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeCategory?.subMenus || []
    }
    const q = searchQuery.toLowerCase().trim()
    return (activeCategory?.subMenus || [])
      .map(sub => ({
        ...sub,
        items: sub.items.filter(item => 
          item.title.toLowerCase().includes(q) || 
          sub.name.toLowerCase().includes(q)
        )
      }))
      .filter(sub => sub.items.length > 0)
  }, [activeCategory, searchQuery])

  // Total count of subcategories in active category
  const totalItemsCount = useMemo(() => {
    return (activeCategory?.subMenus || []).reduce((sum, s) => sum + (s.items?.length || 0), 0)
  }, [activeCategory])

  return (
    <div className="bighaat-categories-page">
      {/* Desktop Navigation Header (Hidden on Mobile) */}
      <div className="desktop-only-nav">
        <Navigation />
      </div>

      {/* Phones: the storefront's header row, the same on every page. */}
      <StoreHeader />

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
            <span className="mobile-header-subtitle">Sathya Bio Agro Hub</span>
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
              placeholder={`Search in ${activeCategory?.name || 'Categories'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          
          {/* LEFT VERTICAL RAIL (ASIDE - BigHaat Native Mobile UI) */}
          <aside className="bighaat-aside-rail" aria-label="Category Rail">
            <div className="aside-rail-scroll">
              {CATEGORIES_DATA.map((cat) => {
                const isActive = 
                  cat.handle.toLowerCase() === activeCategory?.handle.toLowerCase() ||
                  cat.name.toLowerCase() === activeCategory?.name.toLowerCase()

                return (
                  <button
                    key={cat.id || cat.handle}
                    type="button"
                    onClick={() => handleSelectCategory(cat.handle)}
                    className={`bighaat-rail-tab ${isActive ? 'active' : ''}`}
                    title={cat.name}
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

          {/* RIGHT SUBCATEGORIES PANE (Scrollable) */}
          <section 
            id="bighaat-subcat-pane" 
            className="bighaat-subcat-pane"
            aria-label="Subcategories"
          >
            {/* Category Header Banner */}
            <div className="subcat-banner-card">
              <div className="subcat-banner-content">
                <div className="subcat-banner-badge">
                  <Sparkles size={13} className="badge-sparkle" />
                  <span>Verified Sathya Bio Quality</span>
                </div>
                <h2 className="subcat-banner-title">
                  {activeCategory?.name}
                </h2>
                <p className="subcat-banner-desc">
                  Explore {totalItemsCount} verified agricultural {activeCategory?.name.toLowerCase()} & field formulations.
                </p>
              </div>
              <div className="subcat-banner-image">
                <img 
                  src={activeCategory?.icon} 
                  alt={activeCategory?.name} 
                />
              </div>
            </div>

            {/* If search active and no results */}
            {filteredSubMenus.length === 0 && (
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

            {/* Subcategory Groups (e.g. Implements, Agriculture Tools, Accessories, Irrigation) */}
            <div className="subcat-groups-stack">
              {filteredSubMenus.map((sub, sIdx) => (
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

            {/* Sathya Bio Assurance Banner */}
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

      {/* Phones: the header nav above is hidden, so the bottom bar is rendered here. */}
    </div>
  )
}
