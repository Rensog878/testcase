import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Heart, ShoppingCart, Star } from 'lucide-react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'

const FALLBACK_PRODUCT = {
  id: 'sb-6928',
  name: 'momo',
  tagline: 'Herbicide Solution for High Yield',
  category: 'Herbicide',
  price: 789,
  originalPrice: 789,
  stock: 100,
  packSizes: ['250g', '500g', '1kg'],
  selectedPack: '500g',
  image: './assets/p1.png',
  description: 'High-performance bio-crop protection product.',
  detailedDescription: 'High-performance bio-crop protection product.',
  crops: ['Paddy / Rice', 'Wheat'],
  activeIngredient: '100% Bio-Active Formulation',
  dosage: '250g per Acre'
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
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [activeImage, setActiveImage] = useState(0)
  const [selectedPack, setSelectedPack] = useState('')
  const [wishlisted, setWishlisted] = useState(false)
  const [cartAdded, setCartAdded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await axios.get(`/api/products/${encodeURIComponent(id)}`)
        if (cancelled) return
        const loadedProduct = data.data || FALLBACK_PRODUCT
        setProduct(loadedProduct)
        setSelectedPack(loadedProduct.selectedPack || loadedProduct.packSizes?.[0] || '')
        try {
          const wishlistParams = new URLSearchParams(getWishlistIdentity())
          const wishlist = await axios.get(`/api/wishlist?${wishlistParams}`)
          if (!cancelled) setWishlisted((wishlist.data.data || []).some(item => item.productId === loadedProduct.id))
        } catch (wishlistError) {
          console.warn('Could not load wishlist state:', wishlistError)
        }
        try {
          const { data: related } = await axios.get('/api/products?onlineOnly=true')
          if (!cancelled) {
            const ids = loadedProduct.relatedProductIds || []
            setRelatedProducts((related.data || []).filter(item => ids.includes(item.id)))
          }
        } catch (relatedError) {
          console.warn('Could not load related products:', relatedError)
        }
      } catch {
        if (!cancelled) setProduct(id === FALLBACK_PRODUCT.id ? FALLBACK_PRODUCT : null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <div className="product-detail-page"><div className="empty-state"><p>Loading product details...</p></div></div>
  if (!product) return <div className="product-detail-page"><div className="empty-state"><h3>Product not found</h3><button className="btn btn-primary" onClick={() => navigate('/')}>Back to store</button></div></div>

  const images = product.images?.length ? product.images : [product.image].filter(Boolean)
  const resolveImage = image => image?.startsWith('./') ? image.slice(1) : image
  const reviews = product.reviewsEnabled && Array.isArray(product.reviews) ? product.reviews : []
  const averageRating = reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1) : null
  const packSizes = [...new Set(product.packSizes || [])]
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
  const selectedPrice = packagePrice(selectedPack)
  const selectedOriginalPrice = product.originalPrice ? Math.round(Number(product.originalPrice) * (selectedPrice / Number(product.price || 1))) : selectedPrice
  const addToCart = () => {
    let cart = []
    try { cart = JSON.parse(localStorage.getItem('sathya_cart_guest') || '[]') } catch { cart = [] }
    const productId = product._id || product.id
    const existing = cart.find(item => (item._id || item.id) === productId && item.selectedPack === selectedPack)
    if (existing) existing.qty = (existing.qty || 1) + 1
    else cart.push({ ...product, _id: productId, price: selectedPrice, originalPrice: selectedOriginalPrice, selectedPack, qty: 1 })
    localStorage.setItem('sathya_cart_guest', JSON.stringify(cart))
    setCartAdded(true)
  }
  const proceedToCheckout = () => {
    if (!cartAdded) addToCart()
    navigate('/checkout.html')
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
          <div className="product-detail-price">₹{selectedPrice.toLocaleString()} <del>₹{selectedOriginalPrice.toLocaleString()}</del></div>
          {packSizes.length > 0 && <div className="product-pack-selector"><strong>Package size</strong><div>{packSizes.map(pack => <button type="button" key={pack} className={selectedPack === pack ? 'active' : ''} onClick={() => setSelectedPack(pack)}>{pack}<small>₹{packagePrice(pack).toLocaleString()}</small></button>)}</div></div>}
          <p className="product-detail-description">{product.detailedDescription || product.description}</p>
          <div className="product-detail-facts">
            <div><strong>Active ingredient</strong><span>{product.activeIngredient || 'Not specified'}</span></div>
            <div><strong>Dosage</strong><span>{product.dosage || 'Not specified'}</span></div>
            <div><strong>Pack sizes</strong><span>{product.packSizes?.join(', ') || 'Not specified'}</span></div>
            <div><strong>Suitable crops</strong><span>{product.crops?.join(', ') || 'Not specified'}</span></div>
          </div>
          <div className="product-detail-actions">
            <button className="btn btn-primary btn-lg" onClick={addToCart}><ShoppingCart size={18} /> {cartAdded ? 'Added to cart' : 'Add to cart'}</button>
            <button className="btn btn-secondary btn-lg" onClick={proceedToCheckout}>Proceed to checkout</button>
          </div>
        </div>
      </div>

      <div className="product-detail-content-grid">
        <section className="product-detail-section"><h2>How to use</h2><p>{product.howToUse || 'Usage instructions will be published by the administrator.'}</p></section>
        <section className="product-detail-section"><h2>When to use</h2><p>{product.whenToUse || 'Timing guidance will be published by the administrator.'}</p></section>
      </div>

      <section className="product-detail-section product-reviews-section">
        <div className="product-section-heading"><div><h2>Verified customer reviews</h2><p>Only submitted review records are shown here.</p></div><span className={`badge ${product.reviewsEnabled ? 'badge-green' : 'badge-gray'}`}>{product.reviewsEnabled ? 'Reviews enabled' : 'Reviews disabled'}</span></div>
        {reviews.length ? reviews.map(review => <article className="verified-review" key={review.id || `${review.author}-${review.createdAt}`}><div className="review-stars">{'★'.repeat(Number(review.rating || 0))}</div><strong>{review.author || 'Verified customer'}</strong><p>{review.comment}</p></article>) : <div className="empty-state compact"><p>No verified reviews yet.</p></div>}
      </section>

      {product.relatedBlogs?.length > 0 && <section className="product-detail-section"><h2>Related blogs</h2><div className="related-blog-list">{product.relatedBlogs.map(blog => <a key={`${blog.title}-${blog.url}`} href={blog.url} target="_blank" rel="noreferrer">{blog.title}<ExternalLink size={15} /></a>)}</div></section>}

      {relatedProducts.length > 0 && <section className="product-detail-section"><h2>Related products</h2><div className="related-product-grid">{relatedProducts.map(item => <button key={item.id} onClick={() => navigate(`/product/${item.id}`)}><img src={resolveImage(item.images?.[0] || item.image)} alt={item.name} /><strong>{item.name}</strong><span>₹{item.price.toLocaleString()}</span></button>)}</div></section>}
    </div>
  )
}
