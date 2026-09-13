import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Home, ShoppingBag, Sparkles, BookOpen, Menu, X, 
  User, Store, Layers, Wheat, FlaskConical, Stethoscope, 
  Truck, Headphones, MessageCircle, Phone, Globe, ShoppingCart
} from 'lucide-react'

export default function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  const user = JSON.parse(localStorage.getItem('sathya_user') || 'null')

  // Read cart items count
  useEffect(() => {
    try {
      const guestCart = JSON.parse(localStorage.getItem('sathya_cart_guest') || '[]')
      const count = Array.isArray(guestCart) ? guestCart.reduce((acc, i) => acc + (Number(i.qty) || 1), 0) : 0
      setCartCount(count)
    } catch {
      setCartCount(0)
    }
  }, [location.pathname])

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const path = location.pathname

  const isHome = path === '/'
  const isShop = path === '/products' || path === '/categories' || path.startsWith('/product/')
  const isBlog = path === '/blog' || path.startsWith('/blog/')

  const handleAIDoctorClick = () => {
    setIsMenuOpen(false)
    // If on products page, trigger AI scanner or navigate to AI doctor section
    navigate('/whatsapp-ai')
  }

  const handleAccountClick = () => {
    setIsMenuOpen(false)
    const staffHome = { admin: '/admin', employee: '/employee', delivery: '/delivery', billing: '/billing' }
    if (user) {
      navigate(staffHome[user.role] || '/orders')
    } else {
      // Farmers sign in on the storefront; /login is the staff sign-in.
      navigate('/#login')
    }
  }

  return (
    <>
      {/* Mobile Bottom Sheet Backdrop */}
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            zIndex: 9980,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Mobile Slide-Up Menu Sheet */}
      <div 
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9985,
          maxHeight: 'calc(100vh - 72px)',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          boxShadow: '0 -4px 24px rgba(15, 23, 42, 0.18)',
          padding: '12px 16px 86px',
          transform: isMenuOpen ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: isMenuOpen ? 'auto' : 'none'
        }}
      >
        {/* Drag handle */}
        <div style={{ width: '44px', height: '4px', borderRadius: '4px', background: '#cbd5e1', margin: '0 auto 16px' }} />

        {/* User Account Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '16px', background: 'linear-gradient(135deg, #ecfdf5, #f0fdfa)', border: '1px solid #d1fae5', marginBottom: '16px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: '0.92rem', color: '#064e3b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name ? `Welcome, ${user.name}` : 'Welcome to Sathya Bio'}
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {user ? (user.phone || 'Signed in farmer') : 'Sign in to track orders & buy bio products'}
            </span>
          </div>
          <button 
            type="button" 
            onClick={handleAccountClick}
            style={{ padding: '8px 14px', borderRadius: '10px', background: '#059669', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {user ? 'Account' : 'Sign In'}
          </button>
        </div>

        {/* Quick Actions Header */}
        <h4 style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 10px 4px' }}>
          Quick Actions
        </h4>

        {/* Quick Actions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginBottom: '20px' }}>
          <Link to="/products" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={18} />
            </span>
            All Products
          </Link>

          <Link to="/categories" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(8, 145, 178, 0.1)', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} />
            </span>
            Categories
          </Link>

          <Link to="/crops" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(101, 163, 13, 0.1)', color: '#65a30d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wheat size={18} />
            </span>
            Shop by Crop
          </Link>

          <button type="button" onClick={handleAIDoctorClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </span>
            AI Leaf Doctor
          </button>

          <Link to="/blog" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={18} />
            </span>
            Blogs
          </Link>

          <a href="/checkout.html" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cartCount}
                </span>
              )}
            </span>
            My Cart
          </a>

          <Link to="/soil-analyzer" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlaskConical size={18} />
            </span>
            Soil Analyzer
          </Link>

          <Link to="/agronomists" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(219, 39, 119, 0.1)', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stethoscope size={18} />
            </span>
            Agronomists
          </Link>

          <Link to="/orders" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={18} />
            </span>
            Track Order
          </Link>

          <Link to="/support" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(71, 85, 105, 0.1)', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Headphones size={18} />
            </span>
            Support
          </Link>

          <a href="https://wa.me/919442562423?text=Hello%20Sathya%20Bio%20Expert%2C%20I%20need%20crop%20advice" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} />
            </span>
            WhatsApp
          </a>

          <a href="tel:18004259999" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #eef2f7', color: '#1e293b', textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600, textAlign: 'center' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={18} />
            </span>
            Call Toll-Free
          </a>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (5 Tabs: Home | Shop | AI Doctor (FAB) | Blogs | Menu) */}
      <nav 
        className="sathya-mobile-bottom-nav" 
        aria-label="Mobile Navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid #e2e8f0',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 9999,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
          padding: '4px 6px calc(4px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {/* 1. Home */}
        <Link 
          to="/" 
          onClick={() => setIsMenuOpen(false)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: isHome ? '#059669' : '#64748b',
            fontSize: '0.68rem',
            fontWeight: isHome ? 700 : 500,
            gap: '2px',
            background: 'none',
            border: 'none',
            padding: '4px 0'
          }}
        >
          <Home size={20} strokeWidth={isHome ? 2.5 : 2} />
          <span>Home</span>
        </Link>

        {/* 2. Shop */}
        <Link 
          to="/products" 
          onClick={() => setIsMenuOpen(false)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: isShop ? '#059669' : '#64748b',
            fontSize: '0.68rem',
            fontWeight: isShop ? 700 : 500,
            gap: '2px',
            background: 'none',
            border: 'none',
            padding: '4px 0'
          }}
        >
          <ShoppingBag size={20} strokeWidth={isShop ? 2.5 : 2} />
          <span>Shop</span>
        </Link>

        {/* 3. AI Doctor (Raised Center FAB) */}
        <button 
          type="button" 
          onClick={handleAIDoctorClick}
          aria-label="AI Leaf Doctor"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            color: '#064e3b',
            fontSize: '0.68rem',
            fontWeight: 700
          }}
        >
          <div 
            style={{
              width: '48px',
              height: '48px',
              marginTop: '-22px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              border: '4px solid #ffffff',
              boxShadow: '0 6px 16px rgba(4, 120, 87, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              transition: 'transform 0.15s ease'
            }}
          >
            <Sparkles size={22} />
          </div>
          <span style={{ marginTop: '2px' }}>AI Doctor</span>
        </button>

        {/* 4. Blogs */}
        <Link 
          to="/blog" 
          onClick={() => setIsMenuOpen(false)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: isBlog ? '#059669' : '#64748b',
            fontSize: '0.68rem',
            fontWeight: isBlog ? 700 : 500,
            gap: '2px',
            background: 'none',
            border: 'none',
            padding: '4px 0'
          }}
        >
          <BookOpen size={20} strokeWidth={isBlog ? 2.5 : 2} />
          <span>Blogs</span>
        </Link>

        {/* 5. Menu */}
        <button 
          type="button" 
          onClick={() => setIsMenuOpen(open => !open)}
          aria-label="Menu"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isMenuOpen ? '#059669' : '#64748b',
            fontSize: '0.68rem',
            fontWeight: isMenuOpen ? 700 : 500,
            gap: '2px',
            padding: '4px 0',
            position: 'relative'
          }}
        >
          {isMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2} />}
          {cartCount > 0 && (
            <span 
              style={{
                position: 'absolute',
                top: '0px',
                right: '18%',
                background: '#ef4444',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 800,
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {cartCount}
            </span>
          )}
          <span>Menu</span>
        </button>
      </nav>
    </>
  )
}
