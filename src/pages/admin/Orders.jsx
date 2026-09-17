import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'

const SAMPLE_ORDERS = []

const STATUS_COLORS = { Pending: 'yellow', Confirmed: 'blue', Dispatched: 'orange', 'Out for Delivery': 'purple', Delivered: 'green', Cancelled: 'red' }
const STATUSES = ['Pending', 'Confirmed', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled']

const WHATSAPP_BADGES = { sent: ['green', 'Sent'], failed: ['red', 'Failed'], sending: ['yellow', 'Sending'] }

// Whether the customer got their WhatsApp order confirmation, with a way to (re)send it.
function WhatsAppStatus({ order, sending, onSend }) {
  const notification = order.notifications?.orderConfirmation
  const [color, label] = WHATSAPP_BADGES[notification?.status] || ['gray', 'Not sent']
  const detail = notification?.status === 'failed'
    ? notification.error
    : notification?.sentAt ? `Sent ${new Date(notification.sentAt).toLocaleString('en-IN')}` : ''

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className={`badge badge-${color}`} title={detail}>{label}</span>
      <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.72rem' }} disabled={sending} onClick={() => onSend(order)}>
        {sending ? 'Sending…' : notification?.status === 'sent' ? 'Resend' : 'Send'}
      </button>
    </div>
  )
}

// Orders store items as objects; rendering the array directly crashes React.
const itemSummary = items => Array.isArray(items)
  ? items.map(item => `${item.name || 'Product'} x${item.qty || 1}`).join(', ')
  : String(items || '')

export default function AdminOrders() {
  const [orders, setOrders] = useState(SAMPLE_ORDERS)
  useEffect(() => { axios.get('/api/orders').then(({ data }) => setOrders(data.data || [])).catch(() => {}) }, [])
  const [sendingId, setSendingId] = useState(null)

  const setNotification = (id, notification) => {
    if (!notification) return
    setOrders(list => list.map(x => x.id === id ? { ...x, notifications: { ...x.notifications, orderConfirmation: notification } } : x))
  }

  const sendWhatsApp = async order => {
    if (order.notifications?.orderConfirmation?.status === 'sent' &&
      !window.confirm(`Order details were already sent to +91 ${order.customerPhone}. Send them again?`)) return
    setSendingId(order.id)
    try {
      const { data } = await axios.post(`/api/admin/orders/${order.id}/whatsapp`)
      setNotification(order.id, data.notification)
      toast.success(data.message)
    } catch (err) {
      setNotification(order.id, err.response?.data?.notification)
      toast.error(err.response?.data?.message || 'Could not send the WhatsApp message')
    } finally {
      setSendingId(null)
    }
  }

  const updateStatus = (id, status) => {
    setOrders(o => o.map(x => x.id === id ? { ...x, status, deliveryStatus: status } : x))
    axios.put(`/api/orders/${id}/status`, { status, deliveryStatus: status })
      .catch(err => toast.error(err.response?.data?.message || 'Could not save the order status. Refresh and try again.'))
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>📦 Order Management</h1><p>{orders.length} orders total</p></div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order ID</th><th>Customer & contact</th><th>Delivery address</th><th>Items</th><th>Amount</th><th>Status</th><th>Agent</th><th>WhatsApp</th><th>Action</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td><strong style={{ color: 'var(--brand-400)' }}>{o.id}</strong></td>
                  <td><div style={{ fontWeight: 600 }}>{o.farmer || o.customerName}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.customerPhone || 'No phone'}</div></td>
                  <td className="order-address-cell" title={o.address}>{o.addressDetails ? <><strong>{o.addressDetails.label || 'Address'}</strong><br />{[o.addressDetails.doorNo, o.addressDetails.street, o.addressDetails.area, o.addressDetails.taluk, o.addressDetails.district, o.addressDetails.state, o.addressDetails.pincode].filter(Boolean).join(', ')}</> : o.address}</td>
                  <td className="order-items-cell" title={itemSummary(o.items)}>{itemSummary(o.items)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--brand-400)' }}>₹{Number(o.amount || o.total || 0).toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${STATUS_COLORS[o.deliveryStatus || o.status] || 'gray'}`}>{o.deliveryStatus || o.status}</span>
                    {o.stockShortfall && <span className="badge badge-red" style={{ marginLeft: 6 }} title="Paid after stock ran out — check inventory">Stock short</span>}
                  </td>
                  <td>{o.agent || o.assignedDeliveryBoy}</td>
                  <td><WhatsAppStatus order={o} sending={sendingId === o.id} onSend={sendWhatsApp} /></td>
                  <td>
                    <select className="filter-select" style={{ padding: '4px 28px 4px 8px', fontSize: '0.78rem' }} value={o.deliveryStatus || o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
