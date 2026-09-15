import { Link } from 'react-router-dom'
import { ShoppingCart, Truck, Sprout, Search, Languages, Heart, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBasket, useCheckoutActions } from '../../hooks/useCheckout'

// No menu button of its own: the one Menu card on the site is the phone bottom
// bar's (MobileBottomNav). Wider screens show the link strip below the header.
// The basket opens the floating checkout and the account the account card
// (sign-in when signed out) over the page (hooks/useCheckout.js); Order Status
// is its own link.
export default function Navigation() {
  const { user } = useAuth()
  const accountName = user?.name ? user.name.split(' ')[0] : 'Sign in'
  const accountCrop = user?.crop || user?.primaryCrop || 'Account'
  const { count, totals } = useBasket()
  const { openBasket, showAccount } = useCheckoutActions()

  return <>
    <div className="public-ticker"><span>🚜 Free express delivery on orders above ₹999 across all 28 states</span><span>🌿 BlastShield 75 WP — #1 Selling Paddy Fungicide this Kharif Season</span><span>☘ WhatsApp us at 9000-425-999 for instant crop advisory in your language</span></div>
    <div className="public-utility"><div><Link to="/products">Sell on Sathya Bio</Link></div><div><strong>🌿 {user ? `Welcome, ${user.name || 'farmer'}` : 'Welcome, farmer'}</strong><span>📞 Missed Call to Order: 1800-425-9999</span><span>🚚 FREE Shipping on Agro Orders over ₹999</span><select aria-label="Language"><option>🌐 English</option></select></div></div>
    <header className="public-site-header">
      <Link to="/" className="public-brand"><span><Sprout size={24} /></span><strong>SATHYA BIO</strong><small>AGRO PESTICIDE STORE</small></Link>
      <div className="public-search"><select aria-label="Search category"><option>All Categories</option><option>Fungicides</option><option>Insecticides</option><option>Herbicides</option></select><input placeholder="Search by crop, disease or chemical" /><button aria-label="Search"><Search size={20} /></button></div>
      <div className="public-header-actions"><button className="public-icon-action"><Languages size={21} /><small>Language<br /><strong>English</strong></small></button><Link to="/orders" className="public-icon-action"><Truck size={23} /><small>Track<br /><strong>Order Status</strong></small></Link><Link to="/wishlist" className="public-icon-action"><Heart size={23} /><b>0</b><small>Saved<br /><strong>Wishlist</strong></small></Link><a href="#account" className="public-icon-action public-account-action" data-account-open onClick={showAccount}><Sprout size={23} /><small>{accountCrop}<br /><strong>{accountName}</strong></small></a><a href="#basket" className="public-cart-button" data-checkout-open onClick={openBasket}><ShoppingCart size={23} /><b>{count}</b><small>Basket<br /><strong>₹{totals.total.toLocaleString('en-IN')}</strong></small></a></div>
    </header>
    <nav className="public-site-nav"><Link to="/products">▣ All Products</Link><Link to="/categories">▱ Categories</Link><Link to="/crops">Shop by Crop</Link><Link to="/brands">⚙ Brands</Link><Link to="/blog"><BookOpen size={16} /> Blogs</Link><Link to="/products" className="public-ai-button">▣ AI Leaf Doctor</Link></nav>
  </>
}
