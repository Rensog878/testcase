import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { 
  Search, ShoppingCart, Heart, Star, ChevronLeft, ChevronRight, 
  Filter, Check, ArrowRight, PhoneCall, Headphones, Sparkles, 
  Sprout, X, ShieldCheck, Truck, RefreshCw, Layers, Grid, Home, Leaf, ShoppingBag, Globe, User
} from 'lucide-react'
import Navigation from '../components/home/Navigation'
import Footer from '../components/home/Footer'
import axios from 'axios'
import { 
  SHOP_CATEGORIES, 
  TOP_10_PICKS, 
  CROPS_LIST, 
  PESTS_AND_DISEASES, 
  NUTRIENTS_LIST, 
  TODAYS_OFFERS, 
  BEST_SELLING, 
  GROWTH_PROMOTERS, 
  MASTER_PRODUCTS 
} from '../data/allProductsData'

export default function AllProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // Active filters from URL query parameters
  const initialCategory = searchParams.get('category') || ''
  const initialCrop = searchParams.get('crop') || ''
  const initialDisease = searchParams.get('disease') || ''

  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [activeCrop, setActiveCrop] = useState(initialCrop)
  const [activeDisease, setActiveDisease] = useState(initialDisease)
  const [activeNutrient, setActiveNutrient] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [sortBy, setSortBy] = useState('popular')
  const [dbProducts, setDbProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    let cancelled = false
    axios.get('/api/products?onlineOnly=true')
      .then(({ data }) => {
        if (!cancelled && data.success) {
          setDbProducts(data.data || [])
        }
      })
      .catch(err => console.error('Error loading products from DB:', err))
      .finally(() => {
        if (!cancelled) setLoadingProducts(false)
      })
    return () => { cancelled = true }
  }, [])

  // Selected pack sizes for products: { [productId]: sizeString }
  const [selectedSizes, setSelectedSizes] = useState({})
  // Wishlist set of product IDs
  const [wishlist, setWishlist] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('sathya_wishlist_ids') || '[]'))
    } catch {
      return new Set()
    }
  })

  // Cart count state
  const [cartCount, setCartCount] = useState(() => {
    try {
      const cart = JSON.parse(localStorage.getItem('sathya_cart_guest') || '[]')
      return cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
    } catch {
      return 0
    }
  })

  // Toast notification
  const [toastMessage, setToastMessage] = useState('')
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3200)
  }

  // Quick advisory modal
  const [advisoryModalOpen, setAdvisoryModalOpen] = useState(false)

  // Scroll references for carousels
  const top10ScrollRef = useRef(null)
  const cropsScrollRef = useRef(null)
  const offersScrollRef = useRef(null)
  const pestsScrollRef = useRef(null)
  const nutrientsScrollRef = useRef(null)
  const growthScrollRef = useRef(null)
  const catalogSectionRef = useRef(null)

  const scrollCarousel = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -320 : 320
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Sync state with URL params
  useEffect(() => {
    if (searchParams.get('category')) setActiveCategory(searchParams.get('category'))
    if (searchParams.get('crop')) setActiveCrop(searchParams.get('crop'))
    if (searchParams.get('disease')) setActiveDisease(searchParams.get('disease'))
  }, [searchParams])

  const getWishlistIdentity = () => {
    let visitorId = localStorage.getItem('sathya_wishlist_visitor') || ''
    if (!/^visitor-[A-Za-z0-9-]{16,80}$/.test(visitorId)) {
      const random = crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
      visitorId = `visitor-${random}`
      localStorage.setItem('sathya_wishlist_visitor', visitorId)
    }
    let storedUser = null
    try { storedUser = JSON.parse(localStorage.getItem('sathya_user') || 'null') } catch { storedUser = null }
    const token = storedUser?.token || localStorage.getItem('sathya_token')
    return token ? { headers: { Authorization: `Bearer ${token}` } } : { data: { visitorId } }
  }

  // Keep the card state and the server-backed Wishlist page in sync.
  const toggleWishlist = async (productId, productName) => {
    const saved = !wishlist.has(productId)
    setWishlist(prev => {
      const next = new Set(prev)
      if (saved) next.add(productId)
      else next.delete(productId)
      localStorage.setItem('sathya_wishlist_ids', JSON.stringify(Array.from(next)))
      return next
    })
    try {
      const identity = getWishlistIdentity()
      await axios.post('/api/wishlist', { productId, productName, saved, ...(identity.data || {}) }, { headers: identity.headers })
      showToast(saved ? `Added "${productName}" to Wishlist ❤️` : `Removed "${productName}" from Wishlist`)
    } catch {
      setWishlist(prev => {
        const next = new Set(prev)
        if (saved) next.delete(productId)
        else next.add(productId)
        localStorage.setItem('sathya_wishlist_ids', JSON.stringify(Array.from(next)))
        return next
      })
      showToast('Could not update Wishlist. Please try again.')
    }
  }

  // Handle pack size change
  const handleSizeChange = (productId, newSize) => {
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: newSize
    }))
  }

  // Add to cart function
  const handleAddToCart = (product, explicitSize = null) => {
    let cart = []
    try {
      cart = JSON.parse(localStorage.getItem('sathya_cart_guest') || '[]')
    } catch {
      cart = []
    }

    const currentSize = explicitSize || selectedSizes[product.id] || product.selectedSize || product.sizes?.[0]?.size || 'Standard'
    const sizeObj = product.sizes?.find(s => s.size === currentSize)
    const effectivePrice = sizeObj?.price || product.price
    const effectiveOriginalPrice = sizeObj?.originalPrice || product.originalPrice

    const existingIndex = cart.findIndex(item => item.id === product.id && item.selectedPack === currentSize)

    if (existingIndex > -1) {
      cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: effectivePrice,
        originalPrice: effectiveOriginalPrice,
        selectedPack: currentSize,
        image: product.image,
        quantity: 1
      })
    }

    localStorage.setItem('sathya_cart_guest', JSON.stringify(cart))
    const newCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
    setCartCount(newCount)
    showToast(`Added ${product.name.slice(0, 24)}... (${currentSize}) to Basket! 🛒`)
  }

  const top10PicksList = useMemo(() => {
    return dbProducts.slice(0, 10).map((p, idx) => ({
      ...p,
      rank: idx + 1,
      rankBg: '#15803d',
      tagBg: '#dcfce7',
      tagColor: '#166534',
      tagIcon: '🌿',
      tag: p.category || 'Bio',
      sizes: Array.isArray(p.packSizes) ? p.packSizes : ['500g'],
      reviews: p.reviewsCount || 0
    }))
  }, [dbProducts])

  const todaysOffersList = useMemo(() => {
    return dbProducts.filter(p => p.discount || (p.originalPrice && p.originalPrice > p.price)).map(p => ({
      ...p,
      sizes: (Array.isArray(p.packSizes) ? p.packSizes : ['Standard']).map(size => ({
        size,
        price: p.price,
        originalPrice: p.originalPrice || p.price,
        save: Math.max(0, (p.originalPrice || p.price) - p.price)
      }))
    }))
  }, [dbProducts])

  const growthPromotersList = useMemo(() => {
    return dbProducts.filter(p => (p.category || '').toLowerCase().includes('growth') || (p.category || '').toLowerCase().includes('bio-stimulant')).map(p => ({
      ...p,
      sizes: (Array.isArray(p.packSizes) ? p.packSizes : ['Standard']).map(size => ({
        size,
        price: p.price,
        originalPrice: p.originalPrice || p.price,
        save: Math.max(0, (p.originalPrice || p.price) - p.price)
      }))
    }))
  }, [dbProducts])


  // Filter and sort catalog
  const filteredProducts = useMemo(() => {
    let list = [...dbProducts]


    if (activeCategory) {
      list = list.filter(p => 
        p.category?.toLowerCase() === activeCategory.toLowerCase() ||
        (activeCategory === 'Offers' && p.discount >= 20) ||
        (activeCategory === 'Urban Gardening' && (p.category === 'Seeds' || p.category === 'Crop Nutrition'))
      )
    }

    if (activeCrop) {
      list = list.filter(p => 
        p.crops?.some(c => c.toLowerCase().includes(activeCrop.toLowerCase()) || c === 'All Crops')
      )
    }

    if (activeDisease) {
      list = list.filter(p => 
        p.diseases?.some(d => d.toLowerCase().includes(activeDisease.toLowerCase())) ||
        p.name.toLowerCase().includes(activeDisease.toLowerCase())
      )
    }

    if (activeNutrient) {
      list = list.filter(p => p.category === 'Crop Nutrition' || p.name.toLowerCase().includes('nutrient') || p.name.toLowerCase().includes('humic'))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.crops?.some(c => c.toLowerCase().includes(q)) ||
        p.diseases?.some(d => d.toLowerCase().includes(q))
      )
    }

    if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'discount') {
      list.sort((a, b) => (b.discount || 0) - (a.discount || 0))
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    }

    return list
  }, [activeCategory, activeCrop, activeDisease, activeNutrient, searchQuery, sortBy])

  // Quick filter handlers that scroll down to catalog if filtered
  const selectCategory = (cat) => {
    if (activeCategory === cat) {
      setActiveCategory('')
      setSearchParams({})
    } else {
      setActiveCategory(cat)
      setSearchParams({ category: cat })
      if (catalogSectionRef.current) {
        catalogSectionRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const selectCrop = (cropName) => {
    if (activeCrop === cropName) {
      setActiveCrop('')
    } else {
      setActiveCrop(cropName)
      if (catalogSectionRef.current) {
        catalogSectionRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const selectDisease = (diseaseCode) => {
    if (activeDisease === diseaseCode) {
      setActiveDisease('')
    } else {
      setActiveDisease(diseaseCode)
      if (catalogSectionRef.current) {
        catalogSectionRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const selectNutrient = (nutName) => {
    if (activeNutrient === nutName) {
      setActiveNutrient('')
    } else {
      setActiveNutrient(nutName)
      if (catalogSectionRef.current) {
        catalogSectionRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const clearAllFilters = () => {
    setActiveCategory('')
    setActiveCrop('')
    setActiveDisease('')
    setActiveNutrient('')
    setSearchQuery('')
    setSearchParams({})
  }

  // Get active size info for a product
  const getProductActiveSize = (product) => {
    const rawSizes = Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : (Array.isArray(product.packSizes) && product.packSizes.length > 0 
          ? product.packSizes.map(s => ({ size: typeof s === 'object' ? s.size : s, price: product.price, originalPrice: product.originalPrice || product.price })) 
          : [{ size: product.selectedPack || 'Standard', price: product.price, originalPrice: product.originalPrice || product.price }])
    
    const selectedSizeName = selectedSizes[product.id] || product.selectedSize || product.selectedPack || (typeof rawSizes[0] === 'object' ? rawSizes[0]?.size : rawSizes[0]) || 'Standard'
    const match = rawSizes.find(s => (typeof s === 'object' ? s.size : s) === selectedSizeName)
    const price = typeof match === 'object' && match?.price !== undefined ? match.price : product.price
    const orig = typeof match === 'object' && match?.originalPrice !== undefined ? match.originalPrice : (product.originalPrice || product.price)
    return {
      size: selectedSizeName,
      price: Number(price) || 0,
      originalPrice: orig > price ? Number(orig) : null,
      save: orig > price ? orig - price : 0
    }
  }

  return (
    <div className="all-products-page">
      {/* Toast popup */}
      {toastMessage && (
        <div className="shop-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* DESKTOP TOP HEADER */}
      <div className="desktop-only-header-wrap">
        <Navigation cartCount={cartCount} />
      </div>

      {/* MOBILE TOP HEADER (BigHaat / Sathya Bio app style matching screenshot 1) */}
      <header className="mobile-shop-header mobile-only-header">
        <div className="mobile-shop-top-row">
          <Link to="/" className="mobile-shop-brand">
            <span className="brand-leaf-icon"><Sprout size={20} /></span>
            <div className="brand-text-block">
              <strong>SATHYA BIO</strong>
              <small>Agro Store</small>
            </div>
          </Link>

          <div className="mobile-shop-header-actions">
            <button 
              type="button" 
              className="mobile-lang-badge" 
              onClick={() => showToast('Languages: English, Tamil, Telugu, Kannada')}
            >
              <Globe size={14} />
              <span>English</span>
              <span className="down-arrow">▾</span>
            </button>

            <button 
              type="button" 
              className="mobile-header-icon-btn"
              onClick={() => setMobileSearchOpen(prev => !prev)}
              aria-label="Search"
            >
              <Search size={20} />
            </button>

            <Link to="/#login" className="mobile-header-icon-btn" aria-label="Account">
              <User size={20} />
            </Link>

            <Link to="/checkout" className="mobile-header-icon-btn mobile-cart-icon-btn" aria-label="Cart">
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="mobile-cart-badge">{cartCount}</span>}
            </Link>
          </div>
        </div>

        {/* Mobile Search input dropdown */}
        {/* Always shown on phones: the shared header row has no search toggle. */}
        {(
          <div className="mobile-shop-search-expand">
            <div className="mobile-search-input-wrap">
              <Search size={16} className="search-icon-dim" />
              <input 
                type="text"
                placeholder="Search crop, chemical, disease e.g. Blast, Tomato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus={mobileSearchOpen}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="search-clear-btn">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <main className="shop-main-container">

        {/* 1. CATEGORIES CIRCULAR ROW (Matching Image 1 & Mobile Screenshot 1) */}
        <section className="shop-section shop-categories-section">
          <div className="section-header-row">
            <h2 className="section-title">Categories</h2>
            <Link to="/categories" className="view-all-link">View All</Link>
          </div>

          <div className="categories-circular-grid">
            {SHOP_CATEGORIES.map(cat => {
              const isSelected = activeCategory.toLowerCase() === cat.filterCategory.toLowerCase()
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-circle-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectCategory(cat.filterCategory)}
                >
                  <div 
                    className="category-circle-avatar" 
                    style={{ backgroundColor: cat.bg, borderColor: cat.border }}
                  >
                    {cat.iconText ? (
                      <span className="category-percent-icon" style={{ color: cat.textColor }}>{cat.iconText}</span>
                    ) : (
                      <img 
                        src={cat.image} 
                        alt={cat.name} 
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = 'https://media.bighaat.com/categories/Offers_icon.webp'
                        }}
                      />
                    )}
                  </div>
                  <span className="category-circle-label">{cat.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 2. TOP 10 PICKS BY FARMERS (Matching Image 2 & Mobile Screenshot 1) */}
        {top10PicksList.length > 0 && (
        <section className="shop-section top10-picks-section">
          <div className="top10-banner-header">
            <div className="top10-trophy-badge">
              <span className="trophy-symbol">🏆</span>
              <span className="trophy-text">10 TOP</span>
            </div>
            <div className="top10-text-block">
              <h2 className="top10-title">Top 10 Picks by Farmers</h2>
              <p className="top10-subtitle">Find the best picks from the fields</p>
            </div>
          </div>

          <div className="top10-carousel-wrapper">
            <div className="top10-cards-track" ref={top10ScrollRef}>
              {top10PicksList.map(item => {
                return (
                  <div key={item.rank} className="top10-product-card">
                    {/* Top row: Rank number & Category Pill */}
                    <div className="top10-card-header">
                      <div className="top10-rank-circle" style={{ backgroundColor: item.rankBg }}>
                        {item.rank}
                      </div>
                      <div 
                        className="top10-tag-pill" 
                        style={{ backgroundColor: item.tagBg, color: item.tagColor }}
                      >
                        <span className="tag-icon">{item.tagIcon}</span>
                        <span>{item.tag}</span>
                      </div>
                    </div>

                    {/* Image */}
                    <div className="top10-card-image-box">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = './assets/p1.png'
                        }}
                      />
                    </div>

                    {/* Title */}
                    <h3 className="top10-card-title" title={item.title}>
                      {item.title}
                    </h3>

                    {/* Price & Action */}
                    <div className="top10-card-footer">
                      <div className="top10-price-box">
                        <strong className="price-curr">₹{item.price}</strong>
                        {item.originalPrice && (
                          <span className="price-orig">₹{item.originalPrice}</span>
                        )}
                      </div>
                      <button 
                        type="button" 
                        className="top10-quick-add"
                        onClick={() => handleAddToCart(item)}
                        title="Add to Basket"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Left/Right navigation arrows */}
            <div className="carousel-nav-arrows">
              <button 
                type="button" 
                className="carousel-arrow-btn" 
                onClick={() => scrollCarousel(top10ScrollRef, 'left')}
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                type="button" 
                className="carousel-arrow-btn" 
                onClick={() => scrollCarousel(top10ScrollRef, 'right')}
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* 3. SHOP BY CROP 🌾 (Matching Image 3 & Mobile Screenshot 2) */}
        <section className="shop-section shop-by-crop-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Shop By Crop 🌾</h2>
              <p className="section-subtitle">Get solutions customized for your crops.</p>
            </div>
            <Link to="/crops" className="view-all-link">View All</Link>
          </div>

          <div className="crops-scroll-container" ref={cropsScrollRef}>
            {CROPS_LIST.map(crop => {
              const isSelected = activeCrop.toLowerCase() === crop.cropCode.toLowerCase()
              return (
                <button
                  key={crop.id}
                  type="button"
                  className={`crop-circle-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectCrop(crop.cropCode)}
                >
                  <div className="crop-circle-avatar">
                    <img 
                      src={crop.image} 
                      alt={crop.name} 
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&q=80'
                      }}
                    />
                  </div>
                  <span className="crop-circle-label">{crop.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 4. TODAY'S OFFER ⚡ (Matching Image 3 & Mobile Screenshot 2) */}
        {todaysOffersList.length > 0 && (
        <section className="shop-section todays-offers-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Today's Offer ⚡</h2>
              <p className="section-subtitle">Best prices available today.</p>
            </div>
            <button type="button" className="view-all-link" onClick={() => selectCategory('Offers')}>View All</button>
          </div>

          <div className="offers-scroll-wrapper">
            <div className="product-cards-carousel" ref={offersScrollRef}>
              {todaysOffersList.map(prod => {
                const activeSize = getProductActiveSize(prod)
                const isWishlisted = wishlist.has(prod.id)

                return (
                  <div key={prod.id} className="agro-product-card">
                    {/* Top Badges: Discount Tag + Wishlist Heart */}
                    <div className="card-top-bar">
                      <span className="discount-tag">{prod.discount}% OFF</span>
                      <button 
                        type="button" 
                        className={`wishlist-heart-btn ${isWishlisted ? 'active' : ''}`}
                        onClick={() => toggleWishlist(prod.id, prod.name)}
                        aria-label="Add to Wishlist"
                      >
                        <Heart size={18} fill={isWishlisted ? '#ef4444' : 'none'} color={isWishlisted ? '#ef4444' : '#64748b'} />
                      </button>
                    </div>

                    {/* Product Image */}
                    <div className="card-image-box">
                      <Link to={`/product/${encodeURIComponent(prod.id)}`} aria-label={`View ${prod.name}`}>
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = './assets/p1.png'
                          }}
                        />
                      </Link>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="card-rating-badge">
                      <span>{prod.rating} ★</span>
                      <span className="rating-divider">|</span>
                      <span>{prod.reviews}</span>
                    </div>

                    {/* High Demand banner if present */}
                    {prod.tagBadge ? (
                      <div className="card-high-demand-banner">
                        {prod.tagBadge}
                      </div>
                    ) : (
                      <div className="card-high-demand-placeholder" />
                    )}

                    {/* Title & Brand */}
                    <h3 className="card-product-title" title={prod.name}>
                      <Link to={`/product/${encodeURIComponent(prod.id)}`}>
                        {prod.name}
                      </Link>
                    </h3>
                    <p className="card-brand-name">{prod.brand}</p>

                    {/* Price and Savings */}
                    <div className="card-pricing-row">
                      <strong className="card-current-price">₹{activeSize.price}</strong>
                      {activeSize.originalPrice && (
                        <span className="card-original-price">₹{activeSize.originalPrice}</span>
                      )}
                    </div>
                    {activeSize.save > 0 && (
                      <div className="card-savings-pill">
                        <span className="save-icon">✔</span>
                        <span>Save ₹ {activeSize.save}</span>
                      </div>
                    )}

                    {/* Pack Size Selector Dropdown */}
                    <div className="card-size-selector-row">
                      <label htmlFor={`size-select-${prod.id}`}>Size</label>
                      <select 
                        id={`size-select-${prod.id}`}
                        value={activeSize.size}
                        onChange={(e) => handleSizeChange(prod.id, e.target.value)}
                        className="card-size-dropdown"
                      >
                        {prod.sizes.map(s => (
                          <option key={s.size} value={s.size}>
                            {s.size}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Add to Basket button */}
                    <button 
                      type="button" 
                      className="card-add-to-cart-btn"
                      onClick={() => handleAddToCart(prod, activeSize.size)}
                    >
                      <ShoppingCart size={16} />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Desktop scroll arrows */}
            <div className="carousel-nav-arrows">
              <button 
                type="button" 
                className="carousel-arrow-btn" 
                onClick={() => scrollCarousel(offersScrollRef, 'left')}
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                type="button" 
                className="carousel-arrow-btn" 
                onClick={() => scrollCarousel(offersScrollRef, 'right')}
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* 5. SHOP BY PEST & DISEASE 🐞 (Matching Image 4) */}
        <section className="shop-section pest-disease-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Shop by Pest & Disease 🐞</h2>
              <p className="section-subtitle">Find solutions for your crop problems.</p>
            </div>
            <button type="button" className="view-all-link" onClick={() => selectCategory('Insecticide')}>View All</button>
          </div>

          <div className="pests-scroll-container" ref={pestsScrollRef}>
            {PESTS_AND_DISEASES.map(pest => {
              const isSelected = activeDisease.toLowerCase() === pest.issueCode.toLowerCase()
              return (
                <button
                  key={pest.id}
                  type="button"
                  className={`pest-circle-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectDisease(pest.issueCode)}
                >
                  <div className="pest-circle-avatar">
                    <img 
                      src={pest.image} 
                      alt={pest.name} 
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=200&q=80'
                      }}
                    />
                  </div>
                  <span className="pest-circle-label">{pest.name}</span>
                  {pest.subtitle && <span className="pest-circle-sub">{pest.subtitle}</span>}
                </button>
              )
            })}
          </div>
        </section>

        {/* 6. BEST SELLING SECTION (Matching Image 4) */}
        <section className="shop-section best-selling-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Best Selling</h2>
              <p className="section-subtitle">Best prices available today.</p>
            </div>
            <button type="button" className="view-all-link" onClick={() => {
              if (catalogSectionRef.current) catalogSectionRef.current.scrollIntoView({ behavior: 'smooth' })
            }}>View All</button>
          </div>

          <div className="product-cards-carousel">
            {BEST_SELLING.map(prod => {
              const activeSize = getProductActiveSize(prod)
              const isWishlisted = wishlist.has(prod.id)

              return (
                <div key={prod.id} className="agro-product-card">
                  <div className="card-top-bar">
                    <span className="discount-tag">{prod.discount}% OFF</span>
                    <button 
                      type="button" 
                      className={`wishlist-heart-btn ${isWishlisted ? 'active' : ''}`}
                      onClick={() => toggleWishlist(prod.id, prod.name)}
                      aria-label="Add to Wishlist"
                    >
                      <Heart size={18} fill={isWishlisted ? '#ef4444' : 'none'} color={isWishlisted ? '#ef4444' : '#64748b'} />
                    </button>
                  </div>

                  <div className="card-image-box">
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = './assets/p1.png'
                      }}
                    />
                  </div>

                  <div className="card-rating-badge">
                    <span>{prod.rating} ★</span>
                    <span className="rating-divider">|</span>
                    <span>{prod.reviews}</span>
                  </div>

                  {prod.tagBadge ? (
                    <div className="card-high-demand-banner">{prod.tagBadge}</div>
                  ) : (
                    <div className="card-high-demand-placeholder" />
                  )}

                  <h3 className="card-product-title" title={prod.name}>
                    {prod.name}
                  </h3>
                  <p className="card-brand-name">{prod.brand}</p>

                  <div className="card-pricing-row">
                    <strong className="card-current-price">₹{activeSize.price}</strong>
                    {activeSize.originalPrice && (
                      <span className="card-original-price">₹{activeSize.originalPrice}</span>
                    )}
                  </div>
                  {activeSize.save > 0 && (
                    <div className="card-savings-pill">
                      <span className="save-icon">✔</span>
                      <span>Save ₹ {activeSize.save}</span>
                    </div>
                  )}

                  <div className="card-size-selector-row">
                    <label htmlFor={`size-select-${prod.id}`}>Size</label>
                    <select 
                      id={`size-select-${prod.id}`}
                      value={activeSize.size}
                      onChange={(e) => handleSizeChange(prod.id, e.target.value)}
                      className="card-size-dropdown"
                    >
                      {prod.sizes.map(s => (
                        <option key={s.size} value={s.size}>
                          {s.size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="button" 
                    className="card-add-to-cart-btn"
                    onClick={() => handleAddToCart(prod, activeSize.size)}
                  >
                    <ShoppingCart size={16} />
                    <span>Add to Cart</span>
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* 7. SHOP BY NUTRIENTS 🧪 (Requested specifically: "shop by nutreicint") */}
        <section className="shop-section shop-by-nutrients-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Shop by Nutrients 🧪</h2>
              <p className="section-subtitle">Balanced macro, micro and bio-stimulant plant nutrition formulations.</p>
            </div>
            <button type="button" className="view-all-link" onClick={() => selectCategory('Crop Nutrition')}>View All</button>
          </div>

          <div className="nutrients-scroll-container" ref={nutrientsScrollRef}>
            {NUTRIENTS_LIST.map(nut => {
              const isSelected = activeNutrient === nut.name
              return (
                <button
                  key={nut.id}
                  type="button"
                  className={`nutrient-card-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectNutrient(nut.name)}
                >
                  <div className="nutrient-icon-circle">
                    <img 
                      src={nut.image} 
                      alt={nut.name} 
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = 'https://media.bighaat.com/categories/crop_nutrition_ct.webp'
                      }}
                    />
                  </div>
                  <strong className="nutrient-name">{nut.name}</strong>
                  <span className="nutrient-formula">{nut.formula}</span>
                  <small className="nutrient-benefit">{nut.benefit}</small>
                </button>
              )
            })}
          </div>
        </section>

        {/* 8. GROWTH PROMOTERS ✨ (Matching Image 5) */}
        {growthPromotersList.length > 0 && (
        <section className="shop-section growth-promoters-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Growth Promoters ✨</h2>
              <p className="section-subtitle">Boost crop Growth naturally.</p>
            </div>
            <button type="button" className="view-all-link" onClick={() => selectCategory('Growth Promoters')}>View All</button>
          </div>

          <div className="product-cards-carousel" ref={growthScrollRef}>
            {growthPromotersList.map(prod => {
              const activeSize = getProductActiveSize(prod)
              const isWishlisted = wishlist.has(prod.id)

              return (
                <div key={prod.id} className="agro-product-card">
                  <div className="card-top-bar">
                    <span className="discount-tag">{prod.discount}% OFF</span>
                    <button 
                      type="button" 
                      className={`wishlist-heart-btn ${isWishlisted ? 'active' : ''}`}
                      onClick={() => toggleWishlist(prod.id, prod.name)}
                      aria-label="Add to Wishlist"
                    >
                      <Heart size={18} fill={isWishlisted ? '#ef4444' : 'none'} color={isWishlisted ? '#ef4444' : '#64748b'} />
                    </button>
                  </div>

                  <div className="card-image-box">
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = './assets/p3.png'
                      }}
                    />
                  </div>

                  <div className="card-rating-badge">
                    <span>{prod.rating} ★</span>
                    <span className="rating-divider">|</span>
                    <span>{prod.reviews}</span>
                  </div>

                  {prod.tagBadge ? (
                    <div className="card-high-demand-banner">{prod.tagBadge}</div>
                  ) : (
                    <div className="card-high-demand-placeholder" />
                  )}

                  <h3 className="card-product-title" title={prod.name}>
                    {prod.name}
                  </h3>
                  <p className="card-brand-name">{prod.brand}</p>

                  <div className="card-pricing-row">
                    <strong className="card-current-price">₹{activeSize.price}</strong>
                    {activeSize.originalPrice && (
                      <span className="card-original-price">₹{activeSize.originalPrice}</span>
                    )}
                  </div>
                  {activeSize.save > 0 && (
                    <div className="card-savings-pill">
                      <span className="save-icon">✔</span>
                      <span>Save ₹ {activeSize.save}</span>
                    </div>
                  )}

                  <div className="card-size-selector-row">
                    <label htmlFor={`size-select-${prod.id}`}>Size</label>
                    <select 
                      id={`size-select-${prod.id}`}
                      value={activeSize.size}
                      onChange={(e) => handleSizeChange(prod.id, e.target.value)}
                      className="card-size-dropdown"
                    >
                      {prod.sizes.map(s => (
                        <option key={s.size} value={s.size}>
                          {s.size}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="button" 
                    className="card-add-to-cart-btn"
                    onClick={() => handleAddToCart(prod, activeSize.size)}
                  >
                    <ShoppingCart size={16} />
                    <span>Add to Cart</span>
                  </button>
                </div>
              )
            })}
          </div>
        </section>
        )}

        {/* 9. ALL PRODUCTS EXPLORER & FILTER CATALOG SECTION */}
        <section className="shop-section all-products-catalog-section" ref={catalogSectionRef}>
          <div className="catalog-header-box">
            <div className="catalog-title-group">
              <span className="catalog-badge">Complete Store Inventory</span>
              <h2 className="section-title">All Agro Formulations & Seeds</h2>
              <p className="section-subtitle">
                Filter by target crop, fungal/insect disease, nutrient type, or trusted brand
              </p>
            </div>

            {/* Live Search & Sort Bar */}
            <div className="catalog-search-sort-bar">
              <div className="catalog-search-field">
                <Search size={18} className="search-icon-dim" />
                <input 
                  type="text" 
                  placeholder="Search 500+ agro products, chemicals, crops..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="search-clear-btn">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="catalog-sort-select">
                <label htmlFor="catalog-sort-dropdown">Sort by:</label>
                <select 
                  id="catalog-sort-dropdown"
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="popular">Best Selling</option>
                  <option value="discount">Highest Discount</option>
                  <option value="rating">Top Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Filter Category Pills */}
            <div className="catalog-category-filter-pills">
              {[
                { label: 'All Products', value: '' },
                { label: 'Fungicides', value: 'Fungicide' },
                { label: 'Insecticides', value: 'Insecticide' },
                { label: 'Herbicides', value: 'Herbicide' },
                { label: 'Crop Nutrition', value: 'Crop Nutrition' },
                { label: 'Growth Promoters', value: 'Growth Promoters' },
                { label: 'Seeds', value: 'Seeds' },
                { label: 'Equipments', value: 'Equipments' }
              ].map(cat => (
                <button
                  key={cat.label}
                  type="button"
                  className={`cat-pill-btn ${activeCategory === cat.value ? 'active' : ''}`}
                  onClick={() => selectCategory(cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Active Filter Tags */}
            {(activeCategory || activeCrop || activeDisease || activeNutrient || searchQuery) && (
              <div className="active-filters-bar">
                <span className="active-filter-label">Active Filters:</span>
                {activeCategory && (
                  <span className="filter-pill-tag">
                    Category: {activeCategory}
                    <button type="button" onClick={() => setActiveCategory('')}><X size={12} /></button>
                  </span>
                )}
                {activeCrop && (
                  <span className="filter-pill-tag">
                    Crop: {activeCrop}
                    <button type="button" onClick={() => setActiveCrop('')}><X size={12} /></button>
                  </span>
                )}
                {activeDisease && (
                  <span className="filter-pill-tag">
                    Target Issue: {activeDisease}
                    <button type="button" onClick={() => setActiveDisease('')}><X size={12} /></button>
                  </span>
                )}
                {activeNutrient && (
                  <span className="filter-pill-tag">
                    Nutrient: {activeNutrient}
                    <button type="button" onClick={() => setActiveNutrient('')}><X size={12} /></button>
                  </span>
                )}
                {searchQuery && (
                  <span className="filter-pill-tag">
                    Search: "{searchQuery}"
                    <button type="button" onClick={() => setSearchQuery('')}><X size={12} /></button>
                  </span>
                )}
                <button type="button" className="clear-all-filters-btn" onClick={clearAllFilters}>
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="catalog-count-row">
            <span>Showing <strong>{filteredProducts.length}</strong> products</span>
          </div>

          {/* Master Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="catalog-products-grid">
              {filteredProducts.map(prod => {
                const activeSize = getProductActiveSize(prod)
                const isWishlisted = wishlist.has(prod.id)

                return (
                  <div key={prod.id} className="agro-product-card">
                    <div className="card-top-bar">
                      <span className="discount-tag">{prod.discount}% OFF</span>
                      <button 
                        type="button" 
                        className={`wishlist-heart-btn ${isWishlisted ? 'active' : ''}`}
                        onClick={() => toggleWishlist(prod.id, prod.name)}
                        aria-label="Add to Wishlist"
                      >
                        <Heart size={18} fill={isWishlisted ? '#ef4444' : 'none'} color={isWishlisted ? '#ef4444' : '#64748b'} />
                      </button>
                    </div>

                    <div className="card-image-box">
                      <img 
                        src={prod.image} 
                        alt={prod.name} 
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = './assets/p1.png'
                        }}
                      />
                    </div>

                    <div className="card-rating-badge">
                      <span>{prod.rating} ★</span>
                      <span className="rating-divider">|</span>
                      <span>{prod.reviews}</span>
                    </div>

                    {prod.tagBadge ? (
                      <div className="card-high-demand-banner">{prod.tagBadge}</div>
                    ) : (
                      <div className="card-high-demand-placeholder" />
                    )}

                    <h3 className="card-product-title" title={prod.name}>
                      {prod.name}
                    </h3>
                    <p className="card-brand-name">{prod.brand}</p>

                    <div className="card-pricing-row">
                      <strong className="card-current-price">₹{activeSize.price}</strong>
                      {activeSize.originalPrice && (
                        <span className="card-original-price">₹{activeSize.originalPrice}</span>
                      )}
                    </div>
                    {activeSize.save > 0 && (
                      <div className="card-savings-pill">
                        <span className="save-icon">✔</span>
                        <span>Save ₹ {activeSize.save}</span>
                      </div>
                    )}

                    <div className="card-size-selector-row">
                      <label htmlFor={`size-select-${prod.id}`}>Size</label>
                      <select 
                        id={`size-select-${prod.id}`}
                        value={activeSize.size}
                        onChange={(e) => handleSizeChange(prod.id, e.target.value)}
                        className="card-size-dropdown"
                      >
                        {(prod.sizes || (Array.isArray(prod.packSizes) ? prod.packSizes.map(s => ({ size: typeof s === 'object' ? s.size : s })) : [{ size: prod.selectedPack || 'Standard' }])).map(s => (
                          <option key={s.size || s} value={s.size || s}>
                            {s.size || s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button 
                      type="button" 
                      className="card-add-to-cart-btn"
                      onClick={() => handleAddToCart(prod, activeSize.size)}
                    >
                      <ShoppingCart size={16} />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="catalog-empty-state">
              <Sprout size={48} className="empty-sprout-icon" />
              <h3>No Products Found</h3>
              <p>
                {loadingProducts 
                  ? 'Loading real products from database...' 
                  : dbProducts.length === 0 
                    ? 'Only real products added by the administrator appear here. All demo products have been cleared.' 
                    : "We couldn't find any products matching your current filters."}
              </p>
              {dbProducts.length === 0 ? (
                <Link to="/admin/products" style={{ display: 'inline-block', marginTop: '12px', background: '#15803d', color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
                  Open Admin Panel to Add Products
                </Link>
              ) : (
                <button type="button" className="btn-reset-filters" onClick={clearAllFilters}>
                  Reset All Filters
                </button>
              )}
            </div>
          )}
        </section>

        {/* 10. SATHYA BIO VALUE PROPOSITION & TRUST BADGES */}
        <section className="shop-trust-banner">
          <div className="trust-grid">
            <div className="trust-item">
              <ShieldCheck size={28} className="trust-icon" />
              <div>
                <strong>100% Original Products</strong>
                <span>Direct factory batch sourcing with QR purity verification</span>
              </div>
            </div>
            <div className="trust-item">
              <Truck size={28} className="trust-icon" />
              <div>
                <strong>Free Delivery Above ₹999</strong>
                <span>Express field delivery across 28 states & 4,000+ pin codes</span>
              </div>
            </div>
            <div className="trust-item">
              <Headphones size={28} className="trust-icon" />
              <div>
                <strong>Expert Agronomist Helpline</strong>
                <span>Free crop diagnosis & dosage consultation in 5 regional languages</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FLOATING GREEN EXPERT HELPLINE / ADVISORY BUTTON (Matching Mobile Screenshot 1 & 2) */}
      <button 
        type="button" 
        className="floating-agronomist-btn"
        onClick={() => setAdvisoryModalOpen(true)}
        aria-label="Contact Agronomist Advisory"
      >
        <Headphones size={24} />
      </button>

      {/* ADVISORY POPUP MODAL */}
      {advisoryModalOpen && (
        <div className="advisory-modal-backdrop" onClick={() => setAdvisoryModalOpen(false)}>
          <div className="advisory-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <span className="modal-sprout-icon"><Sprout size={20} /></span>
                <strong>Sathya Bio Farmer Advisory</strong>
              </div>
              <button type="button" onClick={() => setAdvisoryModalOpen(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Need customized dosage, pest identification or tank-mix compatibility for your crops?
              </p>
              <div className="advisory-contact-cards">
                <a href="tel:18004259999" className="advisory-action-card">
                  <div className="action-icon-circle call-circle">
                    <PhoneCall size={20} />
                  </div>
                  <div>
                    <strong>Toll-Free Kisan Call Centre</strong>
                    <p>1800-425-9999 (Tamil, Telugu, Kannada, Hindi)</p>
                  </div>
                </a>
                <a href="https://wa.me/919000425999" target="_blank" rel="noopener noreferrer" className="advisory-action-card">
                  <div className="action-icon-circle wa-circle">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <strong>WhatsApp AI Crop Doctor</strong>
                    <p>Send crop photo for instant disease diagnosis</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* DESKTOP FOOTER */}
      <div className="desktop-only-footer">
        <Footer />
      </div>

      {/* Phones: the header nav above is hidden, so the bottom bar is rendered here. */}
    </div>
  )
}
