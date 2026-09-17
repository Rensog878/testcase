import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

// API orders use the store's field names; the cards below were written for these.
const toDeliveryCard = order => ({
  ...order,
  farmer: order.farmer || order.customerName,
  phone: order.phone || order.customerPhone,
  amount: Number(order.amount ?? order.total ?? 0),
  payMode: order.payMode || (order.paymentStatus === 'Paid' ? 'Prepaid' : 'COD'),
  items: Array.isArray(order.items) ? order.items.map(item => `${item.name || 'Product'} x${item.qty || 1}`).join(', ') : order.items,
  status: order.deliveryStatus || order.status,
})

export default function DeliveryDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [otpInputs, setOtpInputs] = useState({})

  useEffect(() => {
    axios.get('/api/delivery/assigned')
      .then(({ data }) => setOrders((data.data || []).map(toDeliveryCard)))
      .catch(() => toast.error('Could not load your deliveries.'))
  }, [])

  // The server is the authority on the OTP — never accept a delivery on the
  // client's word alone, or anyone with the dashboard open can close an order.
  const verifyOTP = (order) => {
    const entered = (otpInputs[order.id] || '').trim()
    if (!entered) {
      toast.error('Enter the OTP the farmer received.')
      return
    }
    axios.post('/api/delivery/verify-otp', { orderId: order.id, otp: entered }).then(({ data }) => {
      setOrders(o => o.map(x => x.id === order.id ? { ...x, ...toDeliveryCard(data.order), status: 'Delivered', deliveryStatus: 'Delivered' } : x))
      toast.success(`✅ OTP verified! Order ${order.id} marked Delivered`)
    }).catch(err => {
      const message = err?.response?.data?.message
      toast.error(message ? `❌ ${message}` : 'Unable to update this delivery.')
    })
  }

  const updateDelivery = (order, updates) => {
    setOrders(items => items.map(item => item.id === order.id ? { ...item, ...updates } : item))
    axios.put(`/api/orders/${order.id}/status`, updates).catch(() => toast.error('Unable to save delivery update.'))
  }

  const KPI = [
    { label: 'Assigned', value: String(orders.length), change: '+4 today', color: 'blue', icon: '🚚' },
    { label: 'Delivered', value: String(orders.filter(o => o.status === 'Delivered').length), change: '89% success', color: 'green', icon: '✅' },
    { label: 'Pending', value: String(orders.filter(o => o.status !== 'Delivered').length), change: '3 route clusters', color: 'yellow', icon: '🧭' },
  ]
  const routeHealth = [
    { label: 'On-time status', value: 92 },
    { label: 'Avg route time', value: 68 },
    { label: 'COD collection', value: 74 },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div><h1>🚚 My deliveries</h1><p>Welcome, {user?.name}. {orders.length} deliveries assigned today.</p></div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {KPI.map(item => (
          <div key={item.label} className={`stat-card ${item.color}`}>
            <div className={`stat-icon ${item.color}`}>{item.icon}</div>
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
            <div className="stat-change positive">{item.change}</div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Route coverage</div>
            <span className="badge badge-orange">3 zones</span>
          </div>
          <div className="mini-graph">
            {[34, 48, 72, 64, 81, 90, 78].map((value, index) => (
              <span key={index} style={{ height: `${value}%` }} className={index === 5 ? 'active' : ''} />
            ))}
          </div>
          <div className="mini-graph-labels">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Delivery health</div>
          </div>
          <div className="region-list">
            {routeHealth.map(item => (
              <div key={item.label} className="region-row">
                <span>{item.label}</span>
                <div className="mini-progress"><span style={{ width: `${item.value}%` }} /></div>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
        {orders.map(order => (
          <div key={order.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <strong style={{ color: 'var(--brand-400)', fontSize: '1rem' }}>{order.id}</strong>
                  <span className={`badge ${order.status === 'Delivered' ? 'badge-green' : order.status === 'Out for Delivery' ? 'badge-orange' : 'badge-blue'}`}>{order.status}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{order.farmer}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px' }}>📍 {order.address}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--brand-400)', fontSize: '1.1rem' }}>₹{order.amount.toLocaleString()}</div>
                <div style={{ fontSize: '0.75rem', color: order.payMode === 'COD' ? 'var(--yellow)' : 'var(--brand-400)', fontWeight: 600, marginTop: '4px' }}>{order.payMode}</div>
              </div>
            </div>

            <div style={{ background: 'rgba(94,99,255,0.05)', border: '1px solid rgba(94,99,255,0.12)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              📦 {order.items}
            </div>

            {order.status !== 'Delivered' && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <select className="filter-select" value={order.deliveryStatus || order.status} onChange={event => updateDelivery(order, { status: event.target.value, deliveryStatus: event.target.value })}>
                {['Assigned', 'Confirmed', 'Dispatched', 'Out for Delivery'].map(status => <option key={status}>{status}</option>)}
              </select>
              <input className="form-input" type="date" value={order.expectedDeliveryDate ? order.expectedDeliveryDate.slice(0, 10) : ''} onChange={event => updateDelivery(order, { expectedDeliveryDate: event.target.value })} />
            </div>}

            {order.status !== 'Delivered' && (
              <div className="delivery-card-actions">
                <div className="delivery-btn-group">
                  <a href={`tel:+91${order.phone}`} className="btn btn-secondary btn-sm">📞 Call Farmer</a>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">🗺️ Navigate</a>
                </div>
                <div className="delivery-otp-row">
                  <input
                    className="form-input"
                    style={{ width: 120, padding: '8px 12px', fontSize: '0.9rem', letterSpacing: 6, textAlign: 'center' }}
                    placeholder="OTP"
                    maxLength={4}
                    value={otpInputs[order.id] || ''}
                    onChange={e => setOtpInputs(o => ({ ...o, [order.id]: e.target.value }))}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => verifyOTP(order)}>✓ Verify & Deliver</button>
                </div>
              </div>
            )}
            {order.status === 'Delivered' && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--brand-400)', fontWeight: 600 }}>
                ✅ Delivered successfully — OTP verified
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
