import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Menu, X, Truck, Sprout, Search, Languages, Heart, BookOpen, FlaskConical, Headphones, ScanLine } from 'lucide-react'
import MobileBottomNav from './MobileBottomNav'

export default function Navigation({ cartCount = 0 }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('sathya_user') || 'null')
  const accountName = user?.name ? user.name.split(' ')[0] : 'Sign in'
  const accountCrop = user?.crop || user?.primaryCrop || 'Account'

  return <>
    <div className="public-ticker"><span>🚜 Free express delivery on orders above ₹999 across all 28 states</span><span>🌿 BlastShield 75 WP — #1 Selling Paddy Fungicide this Kharif Season</span><span>☘ WhatsApp us at 9000-425-999 for instant crop advisory in your language</span></div>
    <div className="public-utility"><div><Link to="/support">Sell on Sathya Bio</Link><Link to="/support">Bulk Order Inquiries</Link><Link to="/support">Corporate Site</Link></div><div><strong>🌿 {user ? `Welcome, ${user.name || 'farmer'}` : 'Welcome, farmer'}</strong><span>📞 Missed Call to Order: 1800-425-9999</span><span>🚚 FREE Shipping on Agro Orders over ₹999</span><select aria-label="Language"><option>🌐 English</option></select></div></div>
    <header className="public-site-header">
      <Link to="/" className="public-brand"><span><Sprout size={24} /></span><strong>SATHYA BIO</strong><small>AGRO PESTICIDE STORE</small></Link>
      <div className="public-search"><select aria-label="Search category"><option>All Categories</option><option>Fungicides</option><option>Insecticides</option><option>Herbicides</option></select><input placeholder="Search by crop, disease or chemical" /><button aria-label="Search"><Search size={20} /></button></div>
      <div className="public-header-actions"><button className="public-icon-action"><Languages size={21} /><small>Language<br /><strong>English</strong></small></button><Link to="/orders" className="public-icon-action"><Truck size={23} /><small>Track<br /><strong>Order Status</strong></small></Link><Link to="/wishlist" className="public-icon-action"><Heart size={23} /><b>0</b><small>Saved<br /><strong>Wishlist</strong></small></Link><Link to={user ? '/' : '/#login'} className="public-icon-action public-account-action"><Sprout size={23} /><small>{accountCrop}<br /><strong>{accountName}</strong></small></Link><Link to={user ? "/checkout.html" : "/#login"} className="public-cart-button"><ShoppingCart size={23} /><b>{cartCount}</b><small>Basket<br /><strong>₹0</strong></small></Link><button className="public-menu-button" onClick={() => setIsMenuOpen(open => !open)}>{isMenuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
    </header>
    <nav className={`public-site-nav ${isMenuOpen ? 'open' : ''}`}><Link to="/products">▣ All Products</Link><Link to="/categories">▱ Categories</Link><Link to="/crops">Shop by Crop</Link><Link to="/brands">⚙ Brands</Link><Link to="/soil-analyzer"><FlaskConical size={16} /> Soil Analyzer</Link><Link to="/whatsapp-ai"><ScanLine size={16} /> WhatsApp N8N AI</Link><Link to="/support"><Headphones size={16} /> Support Tickets</Link><Link to="/agronomists">♟ Agronomists</Link><Link to="/blog"><BookOpen size={16} /> Blogs</Link><Link to="/products" className="public-ai-button">▣ AI Leaf Doctor</Link></nav>
    <MobileBottomNav />
  </>
}
