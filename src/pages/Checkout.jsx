import { Navigate, useLocation } from 'react-router-dom'
import { STEP_HASH, stepForHash } from '../hooks/checkoutRules'

// Old links to /checkout (and /cart, public/checkout.html) open the floating
// checkout every store page has - the same pop-up and the same rules
// (hooks/useCheckout.js) - over the store home page, at the step the link
// names, or the basket.
export default function Checkout() {
  const { hash } = useLocation()
  const step = stepForHash(hash) || 'basket'
  return <Navigate to={{ pathname: '/', hash: `#${STEP_HASH[step]}` }} replace />
}
