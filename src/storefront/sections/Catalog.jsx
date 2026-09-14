import { memo, useMemo } from 'react'
import { useStore } from '../StoreContext'
import { CATEGORIES, CROPS, DISEASES, productImage, useFallbackImage } from '../data'

const MOBILE_CHIPS = [
  ['All', 'All'],
  ['Fungicide', '🌿 Fungicides'],
  ['Insecticide', '🐛 Insecticides'],
  ['Bio-Stimulant', '⚡ Bio-Stimulants'],
  ['Herbicide', '🌾 Herbicides'],
  ['Nematicide', '🪱 Nematicides'],
]
const DEFAULT_PACKS = ['250g', '500g', '1kg']

const ProductCard = memo(function ProductCard({ product: p, user, t, variant }) {
  const { addToCart, openProductPage } = useStore()
  const catalog = variant === 'catalog'

  let personalBadge = null
  if (catalog && user) {
    if (p.targetUserId === user.id) {
      personalBadge = (
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-star"></i> Recommended for You
        </div>
      )
    } else if (user.crop && Array.isArray(p.crops) && p.crops.some(c => user.crop.toLowerCase().includes(String(c).toLowerCase()))) {
      personalBadge = (
        <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, marginBottom: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-seedling"></i> Tailored for {user.crop}
        </div>
      )
    }
  }

  const hasReviews = catalog ? p.reviewsEnabled && p.reviewsCount > 0 : p.reviewsEnabled && p.reviewsCount
  const packs = Array.isArray(p.packSizes) && p.packSizes.length ? p.packSizes : catalog ? DEFAULT_PACKS : []

  return (
    <div className="product-card">
      <span className="discount-tag">{catalog ? p.discount || 'Special Offer' : p.discount}</span>
      <div className="product-img-box">
        <img loading="lazy" decoding="async" src={productImage(p)} alt={p.name} onError={useFallbackImage} />
      </div>
      <div className="card-content">
        <span className="product-category-tag">{p.category}</span>
        {personalBadge}
        <h3 className="product-name">{p.name}</h3>
        <p className="product-tagline">{p.tagline || ''}</p>

        {hasReviews
          ? <div className="rating-row"><i className="fa-solid fa-star"></i><span style={{ fontWeight: 700 }}>{Number(p.rating).toFixed(1)}</span><span style={{ color: 'var(--text-muted)' }}>({p.reviewsCount} {t('reviews')})</span></div>
          : <div className="rating-row" style={{ color: 'var(--text-muted)' }}>No verified reviews yet</div>}

        <div className="price-row">
          <span className="current-price">₹{p.price}</span>
          <span className="original-price">₹{catalog ? p.originalPrice || p.mrp || p.price : p.originalPrice}</span>
        </div>

        <div className="pack-sizes-row">
          {packs.map((pack, idx) => <span key={`${pack}-${idx}`} className={`pack-chip ${idx === 0 ? 'active' : ''}`}>{pack}</span>)}
        </div>

        <div className="card-btn-row">
          <button className={`btn btn-primary ${catalog ? 'add-to-cart-btn' : 'trending-add-btn'}`} data-id={p.id} style={{ flex: 1 }} onClick={() => addToCart(p.id)}>
            <i className="fa-solid fa-cart-shopping"></i> {t('add_to_cart')}
          </button>
          <button className={`btn btn-outline ${catalog ? 'view-details-btn' : 'trending-view-btn'}`} data-id={p.id} onClick={() => openProductPage(p.id)} aria-label={`View ${p.name}`}>
            <i className="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  )
})

export const Catalog = memo(function Catalog({ t, filters, products, catalogOptions, user, filterDrawerOpen }) {
  const { setFilter, resetFilters, filterByCategory, toggleFilterDrawer } = useStore()
  const searchQuery = filters.search.toLowerCase().trim()

  const filtered = useMemo(() => products.filter(p => {
    const matchCrop = filters.crop === 'all' || (p.crops || []).includes(filters.crop)
    const matchDisease = filters.disease === 'all' || (p.diseases || []).includes(filters.disease)
    const matchCategory = filters.category === 'All' || p.category === filters.category
    const matchSearch = searchQuery === ''
      || String(p.name || '').toLowerCase().includes(searchQuery)
      || String(p.description || '').toLowerCase().includes(searchQuery)
      || String(p.activeIngredient || '').toLowerCase().includes(searchQuery)
    return matchCrop && matchDisease && matchCategory && matchSearch
  }), [products, filters.crop, filters.disease, filters.category, searchQuery])

  const activeFilterCount = [filters.crop !== 'all', filters.disease !== 'all', filters.category !== 'All', searchQuery !== ''].filter(Boolean).length
  const cropOptions = catalogOptions?.crops || CROPS
  const categoryOptions = catalogOptions?.categories || CATEGORIES

  return (
    <section className="section" id="catalog">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title" data-i18n="catalog_title">{t('catalog_title')}</h2>
          <p className="section-subtitle" data-i18n="catalog_subtitle">{t('catalog_subtitle')}</p>
        </div>

        {/* Phones: category chips and the filter drawer button */}
        <div className="mobile-catalog-header">
          <div className="mobile-category-chips-scroll" id="mobileCategoryChipsScroll">
            {MOBILE_CHIPS.map(([value, label]) => (
              <button key={value} className={`mobile-cat-chip ${filters.category === value ? 'active' : ''}`} data-cat={value} onClick={() => filterByCategory(value)}>{label}</button>
            ))}
          </div>
          <div className="mobile-filter-bar-row">
            <button className="mobile-filter-drawer-btn" onClick={() => toggleFilterDrawer(true)}>
              <i className="fa-solid fa-sliders"></i>
              <span>Filters &amp; Sort</span>
              <span className="mobile-filter-count-badge" id="mobileFilterCountBadge" style={{ display: activeFilterCount ? 'inline-flex' : 'none' }}>{activeFilterCount}</span>
            </button>
            <span className="mobile-catalog-count" id="mobileCatalogCount">{filtered.length} Products</span>
          </div>
        </div>
        <div className={`sidebar-panel-overlay ${filterDrawerOpen ? 'active' : ''}`} id="sidebarPanelOverlay" onClick={() => toggleFilterDrawer(false)}></div>

        <div className="shop-layout">
          <aside className={`sidebar-panel ${filterDrawerOpen ? 'active' : ''}`} id="sidebarPanel">
            <div className="mobile-filter-drawer-header">
              <h4><i className="fa-solid fa-sliders"></i> Filter &amp; Sort Products</h4>
              <button className="mobile-filter-drawer-close" onClick={() => toggleFilterDrawer(false)} aria-label="Close filters">&times;</button>
            </div>

            <div className="filter-title"><i className="fa-solid fa-filter"></i> <span data-i18n="filter_title">{t('filter_title')}</span></div>

            <div className="filter-section">
              <label className="filter-label" htmlFor="cropSelect"><i className="fa-solid fa-wheat-awn"></i> <span data-i18n="filter_crop">{t('filter_crop')}</span></label>
              <select className="select-input" id="cropSelect" value={filters.crop} onChange={event => setFilter('crop', event.target.value)}>
                {cropOptions.map(crop => <option key={crop.id} value={crop.id}>{crop.name}</option>)}
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label" htmlFor="diseaseSelect"><i className="fa-solid fa-bug"></i> <span data-i18n="filter_disease">{t('filter_disease')}</span></label>
              <select className="select-input" id="diseaseSelect" value={filters.disease} onChange={event => setFilter('disease', event.target.value)}>
                {DISEASES.map(disease => <option key={disease.id} value={disease.id}>{disease.name}</option>)}
              </select>
            </div>

            <div className="filter-section">
              <label className="filter-label" htmlFor="categorySelect"><i className="fa-solid fa-layer-group"></i> <span data-i18n="filter_category">{t('filter_category')}</span></label>
              <select className="select-input" id="categorySelect" value={filters.category} onChange={event => setFilter('category', event.target.value)}>
                {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>

            <button className="btn btn-outline filter-reset-inline" style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }} onClick={resetFilters}>
              <i className="fa-solid fa-rotate-left"></i> <span data-i18n="reset_filters">{t('reset_filters')}</span>
            </button>

            <div className="mobile-filter-drawer-footer">
              <button className="btn btn-outline" onClick={() => { resetFilters(); toggleFilterDrawer(false) }} style={{ flex: 1, justifyContent: 'center' }}>Reset</button>
              <button className="btn btn-primary" onClick={() => toggleFilterDrawer(false)} style={{ flex: 1.5, justifyContent: 'center' }}>Apply Filters</button>
            </div>
          </aside>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span id="productsCount" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {`${t('showing_products')} ${filtered.length} ${t('of_products')} ${products.length} ${t('products_label')}`}
              </span>
            </div>
            <div className="products-grid" id="productsGrid">
              {filtered.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px 20px', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <i className="fa-solid fa-leaf" style={{ fontSize: '3rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
                  <h3 style={{ color: 'var(--primary-dark)' }}>No products found</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Try adjusting crop or disease filters.</p>
                  <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={resetFilters}><i className="fa-solid fa-rotate-left"></i> {t('reset_filters')}</button>
                </div>
              ) : (
                filtered.map(product => <ProductCard key={product.id} product={product} user={user} t={t} variant="catalog" />)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})

export const Trending = memo(function Trending({ t, products }) {
  const trending = useMemo(
    () => products.filter(p => p.badge === 'Best Seller' || p.badge === '100% Organic' || p.rating >= 4.8).slice(0, 4),
    [products],
  )
  return (
    <section className="section" id="relatedProductsSection" style={{ padding: '40px 0', background: '#ffffff' }}>
      <div className="container">
        <div className="section-header-flex">
          <div>
            <h2 className="section-title"><i className="fa-solid fa-fire" style={{ color: 'var(--accent-amber)' }}></i> Trending &amp; Related Products</h2>
            <p className="section-subtitle">Recommended products based on current crop seasonal demand</p>
          </div>
        </div>
        <div className="products-grid" id="trendingProductsGrid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {trending.map(product => <ProductCard key={product.id} product={product} t={t} variant="trending" />)}
        </div>
      </div>
    </section>
  )
})
