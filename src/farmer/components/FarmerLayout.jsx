import { Link } from 'react-router-dom'
import { Headset, Heart, House, LogOut, ShoppingBag, Sprout, Store, Truck } from 'lucide-react'
import { useFarmerT } from '../hooks/useFarmerT.js'
import LanguageToggle from './LanguageToggle'

// Storefront pages are separate HTML documents, so they are plain links;
// React routes use <Link>.
const SIDE_LINKS = [
  { label: 'nav.farm', to: '/farmer', icon: Sprout, current: true },
  { label: 'nav.shopProducts', href: '/storefront.html#catalog', icon: Store },
  { label: 'nav.cart', href: '/checkout.html', icon: ShoppingBag },
  { label: 'nav.trackOrders', href: '/order-status.html', icon: Truck },
  { label: 'nav.wishlist', to: '/wishlist', icon: Heart },
  { label: 'nav.support', href: '/storefront.html#tickets', icon: Headset },
]

// Same floating bar, destinations and Home / Shop / Cart order as the
// storefront's bottom bar, with this dashboard in the middle slot.
const BOTTOM_LINKS = [
  { label: 'nav.home', href: '/storefront.html', icon: House },
  { label: 'nav.shop', href: '/storefront.html#catalog', icon: Store },
  { label: 'nav.farmShort', to: '/farmer', icon: Sprout, current: true },
  { label: 'nav.cart', href: '/checkout.html', icon: ShoppingBag },
  { label: 'nav.orders', href: '/order-status.html', icon: Truck },
]

function NavTarget({ link, className, children }) {
  if (link.to) {
    return <Link to={link.to} className={className} aria-current={link.current ? 'page' : undefined}>{children}</Link>
  }
  return <a href={link.href} className={className}>{children}</a>
}

export default function FarmerLayout({ onSignOut, children }) {
  const { t } = useFarmerT()
  const brand = (
    <a className="fd-brand" href="/storefront.html">
      <span className="fd-brand-name">{t('app.brand')}</span>
      <span className="fd-brand-sub">{t('app.title')}</span>
    </a>
  )

  return (
    <div className="fd-app">
      <a className="fd-skip" href="#fd-main">{t('app.skipToContent')}</a>

      <aside className="fd-sidebar">
        {brand}
        <nav className="fd-side-nav" aria-label={t('nav.label')}>
          <ul>
            {SIDE_LINKS.map(link => (
              <li key={link.label}>
                <NavTarget link={link} className="fd-side-link">
                  <link.icon size={22} aria-hidden="true" />
                  <span>{t(link.label)}</span>
                </NavTarget>
              </li>
            ))}
          </ul>
        </nav>
        <div className="fd-side-footer">
          <LanguageToggle />
          <button type="button" className="fd-button fd-button--secondary" onClick={onSignOut}>
            <LogOut size={20} aria-hidden="true" />
            {t('account.signOut')}
          </button>
        </div>
      </aside>

      <header className="fd-topbar">
        {brand}
        <LanguageToggle />
        <button
          type="button"
          className="fd-button fd-button--secondary fd-icon-button"
          onClick={onSignOut}
          aria-label={t('account.signOut')}
          title={t('account.signOut')}
        >
          <LogOut size={20} aria-hidden="true" />
        </button>
      </header>

      <main id="fd-main" className="fd-main" tabIndex={-1}>
        {children}
      </main>

      <nav className="fd-bottom-nav" aria-label={t('nav.label')}>
        <ul>
          {BOTTOM_LINKS.map(link => (
            <li key={link.label}>
              <NavTarget link={link} className="fd-bottom-link">
                <span className="fd-bottom-icon"><link.icon size={22} aria-hidden="true" /></span>
                <span className="fd-bottom-label">{t(link.label)}</span>
              </NavTarget>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
