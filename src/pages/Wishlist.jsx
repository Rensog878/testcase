import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { cacheWishlistIds, wishlistIdsFrom } from '../shared/wishlist'

export default function Wishlist() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const visitorId = localStorage.getItem('sathya_wishlist_visitor') || ''

  // Signed-in customers are identified by their token; guests by the random
  // visitor id this browser generated when they first saved a product.
  useEffect(() => {
    if (!user && !visitorId) {
      setItems([])
      return
    }
    const params = user ? '' : `?${new URLSearchParams({ visitorId })}`
    axios.get(`/api/wishlist${params}`).then(({ data }) => {
      setItems(data.data || [])
      cacheWishlistIds(wishlistIdsFrom(data.data))
    }).catch(() => setItems([]))
  }, [user?.id, visitorId])

  return (
    <div className="store-section-page animate-fade-in">
      <div className="store-section-heading"><span className="badge badge-green">Saved for later</span><h1>{user?.name ? `${user.name}'s Wishlist` : 'Wishlist'}</h1><p>Keep your favourite crop-care products close at hand.</p></div>
      {items.length ? <div className="wishlist-grid">{items.map(item => <Link className="store-section-card" to={`/product/${item.productId}`} key={item.productId}><strong>{item.productName || 'Saved product'}</strong><span>Product saved to your account</span><small>View product</small></Link>)}</div> : <div className="empty-state"><p>Your wishlist is empty.</p><Link className="btn btn-primary" to="/products">Browse products</Link></div>}
    </div>
  )
}
