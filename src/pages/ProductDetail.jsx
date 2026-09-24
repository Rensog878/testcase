import { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, ExternalLink, Heart, ShoppingCart, Star, Film, Video } from 'lucide-react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { useCheckoutActions } from '../hooks/useCheckout'
import { findCachedProduct } from '../hooks/useCatalogProducts'
import { hasPrice } from '../shared/comingSoon'
import { useCms } from '../context/CmsContext'
import { cmsText } from '../hooks/useCmsSettings'
import { SUPPORT_PHONE, telHref } from '../shared/phoneLink'
import { WHATSAPP_EXPERT_URL } from '../storefront/data'

const getYouTubeId = (url) => {
  if (!url) return null
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

const isHtml5Video = (url) => {
  if (!url) return false
  return url.startsWith('/api/upload') || url.startsWith('data:video') || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

// Signed-in customers are identified by their token on the server. Guests get
// a random, unguessable visitor id so nobody can read another person's list.
const getWishlistIdentity = () => {
  let visitorId = localStorage.getItem('sathya_wishlist_visitor') || ''
  if (!/^visitor-[A-Za-z0-9-]{16,80}$/.test(visitorId)) {
    const random = crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
    visitorId = `visitor-${random}`
    localStorage.setItem('sathya_wishlist_visitor', visitorId)
  }
  return { visitorId }
}

export default function ProductDetail() {
  const { id } = useParams()
  const { cms } = useCms()
  const navigate = useNavigate()
  const { addItem, startCheckout } = useCheckoutActions()
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [activeImage, setActiveImage] = useState(0)
  const [selectedPack, setSelectedPack] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [cartAdded, setCartAdded] = useState(false)
  const [loading, setLoading] = useState(true)

  // Opened from a card, the product is already in this tab's catalogue: it is
  // shown at once and a fresh copy from the server replaces it. Only the
  // product itself is waited for; the heart (wishlist) and related products
  // load alongside and fill in when they arrive.
  const loadProduct = useCallback(async () => {
    const cached = findCachedProduct(id)
    const show = loaded => {
      setProduct(loaded)
      setSelectedPack(current => (current && (loaded.packSizes || []).includes(current) ? current : loaded.selectedPack || loaded.packSizes?.[0] || ''))
    }
    if (cached) {
      show(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }

    const loadWishlist = async productId => {
      try {
        const wishlistParams = new URLSearchParams(getWishlistIdentity())
        const wishlist = await axios.get(`/api/wishlist?${wishlistParams}`)
        setWishlisted((wishlist.data.data || []).some(item => item.productId === productId))
      } catch (wishlistError) {
        console.warn('Could not load wishlist state:', wishlistError)
      }
    }
    const loadRelated = async ids => {
      if (!ids.length) { setRelatedProducts([]); return }
      const known = ids.map(findCachedProduct).filter(Boolean)
      if (known.length === ids.length) { setRelatedProducts(known); return }
      try {
        const { data: related } = await axios.get('/api/products?onlineOnly=true')
        setRelatedProducts((related.data || []).filter(item => ids.includes(item.id)))
      } catch (relatedError) {
        console.warn('Could not load related products:', relatedError)
      }
    }

    if (cached) {
      loadWishlist(cached.id)
      loadRelated(cached.relatedProductIds || [])
    }
    try {
      const { data } = await axios.get(`/api/products/${encodeURIComponent(id)}`)
      if (data.success && data.data) {
        const loadedProduct = data.data
        show(loadedProduct)
        if (!cached) {
          loadWishlist(loadedProduct.id)
          loadRelated(loadedProduct.relatedProductIds || [])
        }
      } else {
        setProduct(null)
      }
    } catch {
      // Keep what the catalogue already showed; only a product we never had is "not found".
      if (!cached) setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  // Real-time update when admin modifies this product
  useEffect(() => {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sathya_catalog') : null
    const onMessage = (event) => {
      if (event.data === 'products-changed') {
        loadProduct()
      }
    }
    if (channel) {
      channel.addEventListener('message', onMessage)
    }
    return () => {
      if (channel) {
        channel.removeEventListener('message', onMessage)
        channel.close()
      }
    }
  }, [loadProduct])

  if (loading) return <div className="product-detail-page"><div className="empty-state"><p>Loading product details...</p></div></div>
  if (!product) return (
    <div className="product-detail-page">
      <div className="empty-state">
        <h3>Product not found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>This formulation might be unavailable or removed from the store catalog.</p>
        <button className="btn btn-primary" onClick={() => navigate('/products')}>Browse Store Products</button>
      </div>
    </div>
  )

  const images = product.images?.length ? product.images : [product.image].filter(Boolean)
  const resolveImage = image => image?.startsWith('./') ? image.slice(1) : image
  const reviews = product.reviewsEnabled && Array.isArray(product.reviews) ? product.reviews : []
  const averageRating = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1) : null
  const packSizes = [...new Set((product.packSizes || []).map(s => typeof s === 'object' ? s.size : s))]
  const basePack = product.selectedPack || packSizes[0]
  const packUnits = pack => {
    const match = String(pack || '').toLowerCase().match(/([\d.]+)\s*(kg|g|litre|liter|l|ml)/)
    if (!match) return 1
    const value = Number(match[1])
    return ['kg', 'litre', 'liter', 'l'].includes(match[2]) ? value * 1000 : value
  }

  const packagePrice = pack => {
    const explicit = product.packagePrices?.[pack] || product.packPrices?.[pack]
    if (explicit !== undefined) return Number(explicit)
    if (!basePack || !pack) return Number(product.price || 0)
    return Math.round(Number(product.price || 0) * (packUnits(pack) / packUnits(basePack)))
  }

  const packageMrp = pack => {
    const explicit = product.packageMrps?.[pack] || product.packMrps?.[pack]
    if (explicit !== undefined) return Number(explicit)
    const price = packagePrice(pack)
    const basePrice = Number(product.price || 1)
    const baseMrp = Number(product.originalPrice || product.mrp || product.price)
    return baseMrp ? Math.round(baseMrp * (price / basePrice)) : price
  }

  const selectedPrice = packagePrice(selectedPack)
  const selectedOriginalPrice = packageMrp(selectedPack)
  const totalPrice = selectedPrice * quantity
  const priced = hasPrice(product)
  const supportPhone = cmsText(cms, 'phone', SUPPORT_PHONE)
  const totalOriginalPrice = selectedOriginalPrice * quantity

  // A different size or quantity is a new choice: "Added to cart" (and
  // Proceed to checkout skipping the add) only holds for what was added.
  const choosePack = pack => { setSelectedPack(pack); setCartAdded(false) }
  const changeQuantity = delta => { setQuantity(q => Math.max(1, q + delta)); setCartAdded(false) }

  const addToCart = () => {
    addItem({ ...product, id: product.id || product._id, price: selectedPrice, originalPrice: selectedOriginalPrice, selectedPack }, quantity)
    setCartAdded(true)
  }
  const proceedToCheckout = () => {
    if (!cartAdded) addToCart()
    startCheckout()
  }
  const toggleWishlist = async () => {
    const identity = getWishlistIdentity()
    const next = !wishlisted
    setWishlisted(next)
    try {
      await axios.post('/api/wishlist', { productId: product.id || product._id, productName: product.name, ...identity, saved: next })
    } catch {
      setWishlisted(!next)
    }
  }

  return (
    <div className="product-detail-page animate-fade-in">
      <button className="btn btn-ghost product-back-button" onClick={() => navigate('/')}><ArrowLeft size={17} /> Back to store</button>

      <div className="product-detail-hero">
        <div className="product-gallery">
          <div className="product-detail-image-zoom">
            <img src={resolveImage(images[activeImage])} alt={product.name} />
          </div>
          <div className="product-thumbnails">
            {images.map((image, index) => (
              <button key={`${image}-${index}`} className={index === activeImage ? 'active' : ''} onClick={() => setActiveImage(index)}>
                <img src={resolveImage(image)} alt={`${product.name} view ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="product-detail-summary">
          <div className="product-detail-heading-row"><span className="badge badge-green">{product.category}</span><button className={`product-detail-wishlist ${wishlisted ? 'active' : ''}`} onClick={toggleWishlist} aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}><Heart size={21} fill={wishlisted ? 'currentColor' : 'none'} /></button></div>
          <h1>{product.name}</h1>
          <p className="product-detail-tagline">{product.tagline}</p>
          <div className="product-detail-review-summary">
            {averageRating ? <><Star size={16} fill="currentColor" /> {averageRating} ({reviews.length} verified reviews)</> : 'No verified reviews yet'}
          </div>
          <div className="product-detail-price">
            {priced
              ? <>₹{totalPrice.toLocaleString()} {totalOriginalPrice > totalPrice && <del>₹{totalOriginalPrice.toLocaleString()}</del>}</>
              : 'Price coming soon'}
          </div>

          {priced && packSizes.length > 0 && (
            <div className="product-pack-selector">
              <strong id="packSizeLabel">Package size</strong>
              <div role="group" aria-labelledby="packSizeLabel">
                {packSizes.map(pack => (
                  <button type="button" key={pack} className={selectedPack === pack ? 'active' : ''} aria-pressed={selectedPack === pack} onClick={() => choosePack(pack)}>
                    {pack}<small>₹{packagePrice(pack).toLocaleString()}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {priced && <div className="product-qty-row">
            <strong id="qtyLabel">Quantity</strong>
            <div className="product-qty" role="group" aria-labelledby="qtyLabel">
              <button type="button" onClick={() => changeQuantity(-1)} disabled={quantity <= 1} aria-label="Fewer">−</button>
              <span aria-live="polite">{quantity}</span>
              <button type="button" onClick={() => changeQuantity(1)} aria-label="More">+</button>
            </div>
            {quantity > 1 && (
              <span className="product-qty-sum">₹{selectedPrice.toLocaleString()} × {quantity}{selectedPack ? ` · ${selectedPack} each` : ''}</span>
            )}
          </div>}

          <p className="product-detail-description">{product.detailedDescription || product.description}</p>
          <div className="product-detail-facts">
            <div><strong>Active ingredient</strong><span>{product.activeIngredient || 'Not specified'}</span></div>
            <div><strong>Dosage</strong><span>{product.dosage || 'Not specified'}</span></div>
            <div><strong>Pack sizes</strong><span>{priced ? product.packSizes?.join(', ') || 'Not specified' : 'Coming Soon'}</span></div>
            <div><strong>Suitable crops</strong><span>{product.crops?.join(', ') || 'Not specified'}</span></div>
          </div>
          <div className="product-detail-actions">
            {priced ? (
              <>
                <button className="btn btn-primary btn-lg" onClick={addToCart}><ShoppingCart size={18} /> {cartAdded ? 'Added to cart' : 'Add to cart'}</button>
                <button className="btn btn-secondary btn-lg" onClick={proceedToCheckout}>Proceed to checkout</button>
              </>
            ) : (
              // Not priced yet: the farmer can still ask about it.
              <>
                <a className="btn btn-primary btn-lg" href={telHref(supportPhone)}>Call now</a>
                <a className="btn btn-secondary btn-lg" href={WHATSAPP_EXPERT_URL} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="product-detail-content-grid">
        <section className="product-detail-section"><h2>How to use</h2><p>{product.howToUse || 'Usage instructions will be published by the administrator.'}</p></section>
        <section className="product-detail-section"><h2>When to use</h2><p>{product.whenToUse || 'Timing guidance will be published by the administrator.'}</p></section>
      </div>

      {/* Product Demonstrations & Field Usage Videos */}
      {Array.isArray(product.taggedVideos) && product.taggedVideos.length > 0 && (
        <section className="product-detail-section product-videos-section" style={{ marginTop: '32px' }}>
          <div className="product-section-heading" style={{ marginBottom: '20px' }}>
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={22} style={{ color: '#22c55e' }} />
                Product Demonstrations &amp; Field Usage
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Watch expert agronomy demonstrations, dilution guidance, and field trial results.
              </p>
            </div>
            <span className="badge badge-green">
              {product.taggedVideos.length} {product.taggedVideos.length === 1 ? 'Demo Video' : 'Demo Videos'}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: product.taggedVideos.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {product.taggedVideos.map((vid, i) => {
              const videoUrl = typeof vid === 'string' ? vid : (vid.url || vid.videoUrl)
              const ytId = getYouTubeId(videoUrl)
              const isLocal = isHtml5Video(videoUrl)
              const title = typeof vid === 'object' && vid.title ? vid.title : `Product Demo ${i + 1}`
              const category = typeof vid === 'object' && vid.category ? vid.category : 'Demonstration'

              return (
                <div key={i} className="card" style={{
                  background: 'var(--dark-800)', border: '1px solid var(--dark-700)',
                  borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                    {ytId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ width: '100%', height: '100%', border: 0 }}
                      />
                    ) : isLocal ? (
                      <video
                        src={videoUrl}
                        controls
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <iframe
                        src={videoUrl}
                        title={title}
                        allowFullScreen
                        style={{ width: '100%', height: '100%', border: 0 }}
                      />
                    )}
                  </div>
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{category}</span>
                        <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Verified Demo</span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {title}
                      </h3>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="product-detail-section product-reviews-section">
        <div className="product-section-heading"><div><h2>Verified customer reviews</h2><p>Only submitted review records are shown here.</p></div><span className={`badge ${product.reviewsEnabled ? 'badge-green' : 'badge-gray'}`}>{product.reviewsEnabled ? 'Reviews enabled' : 'Reviews disabled'}</span></div>
        {reviews.length ? reviews.map(review => <article className="verified-review" key={review.id || `${review.author}-${review.createdAt}`}><div className="review-stars">{'★'.repeat(Number(review.rating || 0))}</div><strong>{review.author || 'Verified customer'}</strong><p>{review.comment}</p></article>) : <div className="empty-state compact"><p>No verified reviews yet.</p></div>}
      </section>

      {product.relatedBlogs?.length > 0 && <section className="product-detail-section"><h2>Related blogs</h2><div className="related-blog-list">{product.relatedBlogs.map(blog => <a key={`${blog.title}-${blog.url}`} href={blog.url} target="_blank" rel="noreferrer">{blog.title}<ExternalLink size={15} /></a>)}</div></section>}

      {relatedProducts.length > 0 && <section className="product-detail-section"><h2>Related products</h2><div className="related-product-grid">{relatedProducts.map(item => <button key={item.id} onClick={() => navigate(`/product/${item.id}`)}><img src={resolveImage(item.images?.[0] || item.image)} alt={item.name} /><strong>{item.name}</strong><span>{hasPrice(item) ? `₹${Number(item.price).toLocaleString()}` : 'Price coming soon'}</span></button>)}</div></section>}
    </div>
  )
}
