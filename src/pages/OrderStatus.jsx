import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const itemSummary = items => Array.isArray(items)
  ? items.map(item => `${item.name || 'Product'} x${item.qty || 1}`).join(', ')
  : 'Crop inputs'

export default function OrderStatus() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // The server returns only the signed-in customer's own orders.
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    axios.get('/api/orders').then(({ data }) => setOrders(data.data || [])).catch(() => setOrders([])).finally(() => setLoading(false))
  }, [user?.id])

  if (!user) {
    return <div className="store-section-page animate-fade-in"><div className="store-section-heading"><span className="badge badge-green">Order tracking</span><h1>Order Status</h1><p>Sign in to see orders linked to your account.</p></div><div className="empty-state"><Link className="btn btn-primary" to="/#login">Sign in</Link></div></div>
  }

  return <div className="store-section-page animate-fade-in"><div className="store-section-heading"><span className="badge badge-green">Order tracking</span><h1>{`${user.name}'s Orders`}</h1><p>{`Orders linked to ${user.name}.`}</p></div>{loading ? <div className="empty-state"><p>Loading orders...</p></div> : orders.length ? <div className="order-status-list">{orders.map(order => <article className="store-section-card" key={order.id}><strong>{order.id}</strong><span>{itemSummary(order.items)}</span><small>{order.deliveryStatus || order.status || 'Confirmed'} · ₹{Number(order.total || 0).toLocaleString()}</small>{order.address && <small>Delivering to: {order.address}</small>}{order.otp && order.deliveryStatus !== 'Delivered' && <small>Delivery OTP: {order.otp}</small>}</article>)}</div> : <div className="empty-state"><p>No orders found for this account yet.</p></div>}</div>
}
