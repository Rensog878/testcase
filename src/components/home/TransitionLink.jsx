import { forwardRef } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { startPageTransition } from './pageTransition'

// A router Link whose page change runs as a view transition on phones: the
// ticker, header row and bottom bar (named in index.css, "PAGE-TO-PAGE") stay
// put and only the content cross-fades - the same as moving between the
// storefront and the React pages. Browsers without view transitions navigate
// as a plain Link.
const TransitionLink = forwardRef(function TransitionLink({ to, onClick, ...props }, ref) {
  const navigate = useNavigate()

  const handleClick = event => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!document.startViewTransition || !window.matchMedia('(max-width: 768px)').matches) return
    // Only the hash changes (/#account, /#basket, a section): the page stays,
    // so there is nothing to cross-fade. Run as a transition, the page froze
    // while it re-rendered and the sign-in popup faded in under the header
    // and bar, flickering light and dark.
    const next = new URL(event.currentTarget.href, window.location.href)
    if (next.pathname === window.location.pathname && next.search === window.location.search) return
    event.preventDefault()
    // From the open Menu, the sheet's own slide-out is the transition. As a
    // view transition the open sheet was frozen into the old page's snapshot
    // and stayed on screen, not moving, until the next page had rendered
    // (filmed: ~750ms at full speed), then vanished without sliding away.
    // The slide starts on the next frame and the page changes on the one
    // after: once started it runs off the main thread, so rendering the new
    // page no longer holds it back.
    if (document.body.classList.contains('menu-open')) {
      requestAnimationFrame(() => requestAnimationFrame(() => navigate(to)))
      return
    }
    startPageTransition(() => flushSync(() => navigate(to)))
  }

  return <Link ref={ref} to={to} onClick={handleClick} {...props} />
})

export default TransitionLink
