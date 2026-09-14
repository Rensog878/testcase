import { forwardRef } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'

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
    event.preventDefault()
    const transition = document.startViewTransition(() => flushSync(() => navigate(to)))
    // A transition the browser skips still changes the page; only the
    // animation is lost, so that is not an error.
    transition.ready.catch(() => {})
    transition.finished.catch(() => {})
  }

  return <Link ref={ref} to={to} onClick={handleClick} {...props} />
})

export default TransitionLink
