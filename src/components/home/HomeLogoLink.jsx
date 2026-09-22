import TransitionLink from './TransitionLink'

// The Sathyam Agro Mart logo as a link home, shared by the desktop header
// (storefront/sections/Header.jsx), the phone header (StoreHeader.jsx) and
// the footer. From any page it goes to "/"; on the home page, where there is
// nowhere to go, it takes the shopper back to the top instead.
export default function HomeLogoLink({ onClick, ...props }) {
  const handleClick = event => {
    onClick?.(event)
    if (window.location.pathname === '/' && !window.location.search) {
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' })
    }
  }
  return <TransitionLink to="/" aria-label="Sathyam Agro Mart home" onClick={handleClick} {...props} />
}
