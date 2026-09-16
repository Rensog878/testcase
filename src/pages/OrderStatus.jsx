import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import ComingSoon from '../components/ComingSoon'

// Order Management / Order Tracking is Phase 2 work — not part of this
// presentation build. Showing "Coming soon" instead; the real page is kept
// below, commented out, to restore later.

/*
// Order status for the signed-in customer; the server only ever returns their
// own orders. Replaces public/order-status.html, which now redirects here.
// Styles: index.css, "ORDER STATUS".

// Checkout queues "Order placed" (js/toast.js toast.flash) before redirecting here.
const FLASH_KEY = 'sbt-flash'

function showCarriedOverMessages() {
  let queued = []
  try {
    queued = JSON.parse(sessionStorage.getItem(FLASH_KEY) || '[]')
    sessionStorage.removeItem(FLASH_KEY)
  } catch {
    return
  }
  queued.forEach(({ message, type, description, duration }) => {
    const show = typeof toast[type] === 'function' ? toast[type] : toast
    show(message, { description, duration })
  })
}

const statusClass = status =>
  /deliver(ed)?$/i.test(status) ? 'is-delivered'
    : /cancel/i.test(status) ? 'is-cancelled'
      : /transit|shipped|out for/i.test(status) ? 'is-transit'
        : ''

function OrderCard({ order }) {
  const status = order.deliveryStatus || order.status || 'Confirmed'
  const items = Array.isArray(order.items) && order.items.length
    ? order.items.map(item => `${item.name || 'Product'} x${item.qty || 1}`).join(', ')
    : 'Crop inputs'
  const expected = order.expectedDeliveryDate
    ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN')
    : 'To be updated'
  const total = Number(order.total)

  return (
    <div className="order-row">
      <div className="order-card-head">
        <span className="order-card-id">{order.id}</span>
        <span className={`order-badge ${statusClass(status)}`}>{status}</span>
      </div>
      <div className="order-card-meta">
        <div className="muted"><i className="fa-solid fa-box" aria-hidden="true"></i> {items}</div>
        {total > 0 && <div className="muted"><i className="fa-solid fa-indian-rupee-sign" aria-hidden="true"></i> ₹{total.toLocaleString('en-IN')}</div>}
        <div className="muted"><i className="fa-regular fa-calendar" aria-hidden="true"></i> Expected: {expected}</div>
        {order.address && <div className="muted"><i className="fa-solid fa-location-dot" aria-hidden="true"></i> Delivering to: {order.address}</div>}
      </div>
      {order.otp && status !== 'Delivered' && (
        <div className="order-card-otp">
          <i className="fa-solid fa-key" aria-hidden="true"></i> Delivery OTP (share only with the delivery agent): <strong>{order.otp}</strong>
        </div>
      )}
    </div>
  )
}

export default function OrderStatus() {
  const { user, loading: sessionLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error | expired

  useEffect(() => {
    showCarriedOverMessages()
  }, [])

  const loadOrders = useCallback(() => {
    setState('loading')
    axios.get('/api/orders')
      .then(({ data }) => {
        setOrders(Array.isArray(data?.data) ? data.data : [])
        setState('ready')
      })
      .catch(err => {
        // A 401 also signs the visitor out (AuthContext), which shows the sign-in message.
        setState(err?.response?.status === 401 ? 'expired' : 'error')
      })
  }, [])

  useEffect(() => {
    if (user) loadOrders()
  }, [user?.id, loadOrders])

  let intro
  let body
  if (sessionLoading || (user && state === 'loading')) {
    intro = 'Loading your registered orders...'
    body = <p className="muted">Loading...</p>
  } else if (!user) {
    intro = state === 'expired'
      ? 'Your session has expired. Please sign in again.'
      : 'Sign in to see the orders linked to your account.'
    body = <p className="muted"><Link to="/">Go to the store</Link> and sign in from the account menu.</p>
  } else if (state === 'error') {
    intro = 'Order service is unavailable.'
    body = (
      <>
        <p className="muted">Please try again shortly.</p>
        <button type="button" className="retry-button" onClick={loadOrders}>Retry</button>
      </>
    )
  } else {
    intro = `Orders for ${user.name || user.phone || 'your account'}`
    body = orders.length
      ? orders.map(order => <OrderCard key={order.id} order={order} />)
      : <p className="muted">No orders found for this account yet.</p>
  }

  return (
    <div className="sb-orders-page">
      <h1>Order status</h1>
      <p className="muted">{intro}</p>
      <section className="status-card" aria-live="polite">{body}</section>
    </div>
  )
}
*/

export default function OrderStatus() {
  return (
    <div className="sb-orders-page">
      <ComingSoon title="Order tracking — coming soon" message="You'll be able to track your orders right here soon." />
    </div>
  )
}
