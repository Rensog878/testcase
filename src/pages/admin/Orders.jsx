import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Search, RefreshCw, ShoppingBag, Receipt, Filter,
  Phone, User, CheckCircle2, Clock, Truck, Eye, FileText
} from 'lucide-react'

const STATUS_COLORS = {
  Pending: 'yellow',
  Confirmed: 'blue',
  Dispatched: 'orange',
  'Out for Delivery': 'purple',
  Delivered: 'green',
  Cancelled: 'red'
}
const STATUSES = ['Pending', 'Confirmed', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled']

const WHATSAPP_BADGES = { sent: ['green', 'Sent'], failed: ['red', 'Failed'], sending: ['yellow', 'Sending'] }

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

const itemSummary = items => Array.isArray(items)
  ? items.map(item => `${item.name || 'Product'} x${item.qty || 1}`).join(', ')
  : String(items || '')

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState('all') // 'all', 'online', 'offline'
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sendingId, setSendingId] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('sathya_user') || '{}')
    const token = user.token || localStorage.getItem('sathya_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ordersRes, invoicesRes] = await Promise.all([
        axios.get('/api/orders').catch(() => ({ data: { data: [] } })),
        axios.get('/api/billing/invoices', { headers: authHeader() }).catch(() => ({ data: { data: [] } }))
      ])
      setOrders(ordersRes.data?.data || [])
      setInvoices(invoicesRes.data?.data || [])
    } catch {
      toast.error('Could not load transactions from database')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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

  // The delivery address as one line. Orders carry either a structured
  // addressDetails or a plain address string, depending on when they were
  // placed, so both are handled.
  const addressOf = tx => {
    const d = tx.addressDetails
    if (d) {
      return [d.doorNo, d.street, d.area, d.taluk, d.district, d.state, d.pincode].filter(Boolean).join(', ')
    }
    return tx.address || ''
  }

  // Combine and normalize transactions
  const combined = [
    ...orders.map(o => ({
      ...o,
      channel: 'online',
      txId: o.id,
      date: o.createdAt,
      customer: o.farmer || o.customerName || 'Online Guest',
      phone: o.customerPhone || '',
      amount: Number(o.amount || o.total || 0),
      statusText: o.deliveryStatus || o.status || 'Pending',
      paymentMethod: o.paymentMethod || 'Razorpay / Online',
      itemsSummary: itemSummary(o.items)
    })),
    ...invoices.map(inv => ({
      ...inv,
      channel: 'offline',
      txId: inv.id,
      date: inv.date,
      customer: inv.customerName || 'Counter Customer',
      phone: inv.customerPhone || '',
      amount: Number(inv.grandTotal || inv.total || 0),
      statusText: 'Completed (Counter)',
      paymentMethod: inv.paymentMode || 'Cash',
      itemsSummary: itemSummary(inv.items)
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

  const filtered = combined.filter(tx => {
    if (activeTab === 'online' && tx.channel !== 'online') return false
    if (activeTab === 'offline' && tx.channel !== 'offline') return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      String(tx.txId || '').toLowerCase().includes(term) ||
      String(tx.customer || '').toLowerCase().includes(term) ||
      String(tx.phone || '').toLowerCase().includes(term) ||
      String(tx.paymentMethod || '').toLowerCase().includes(term) ||
      String(tx.itemsSummary || '').toLowerCase().includes(term)
    )
  })

  const onlineRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' || o.deliveryStatus === 'Delivered' ? Number(o.total || o.amount || 0) : 0), 0)
  const offlineRevenue = invoices.reduce((sum, i) => sum + Number(i.grandTotal || i.total || 0), 0)
  const totalRevenue = onlineRevenue + offlineRevenue

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            📦 Orders &amp; Billing Invoices
          </h1>
          <p>Real-time omnichannel sales: Web customer orders &amp; physical counter POS billing invoices</p>
        </div>
        <button className="btn btn-outline" onClick={fetchData} title="Refresh sales data">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', background: 'var(--dark-800)', border: '1px solid var(--dark-700)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Omnichannel Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{orders.length} web + {invoices.length} counter bills</div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--dark-800)', border: '1px solid var(--dark-700)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🌐 Online Store Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa' }}>{orders.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>₹{onlineRevenue.toLocaleString('en-IN')} revenue</div>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--dark-800)', border: '1px solid var(--dark-700)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>🏬 POS Counter Bills</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>{invoices.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>₹{offlineRevenue.toLocaleString('en-IN')} counter collection</div>
        </div>
      </div>

      {/* Filters & Channel Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Channel Tab Selector */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--dark-800)', padding: '4px', borderRadius: '10px', border: '1px solid var(--dark-700)' }}>
          <button
            onClick={() => setActiveTab('all')}
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            All Sales ({combined.length})
          </button>
          <button
            onClick={() => setActiveTab('online')}
            className={`btn ${activeTab === 'online' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            🌐 Online Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`btn ${activeTab === 'offline' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            🏬 Counter Bills ({invoices.length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            style={{ width: '100%', paddingLeft: '36px', borderRadius: '8px', fontSize: '0.82rem' }}
            placeholder="Search order/bill ID, customer, phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="card" style={{ background: 'var(--dark-800)', borderRadius: '12px', border: '1px solid var(--dark-700)', overflow: 'hidden' }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--dark-700)' }}>
                <th style={{ padding: '14px 16px' }}>Channel</th>
                <th style={{ padding: '14px 16px' }}>Tx / Order ID</th>
                <th style={{ padding: '14px 16px' }}>Date</th>
                <th style={{ padding: '14px 16px' }}>Customer</th>
                <th style={{ padding: '14px 16px' }}>Items Summary</th>
                <th style={{ padding: '14px 16px' }}>Total</th>
                <th style={{ padding: '14px 16px' }}>Payment</th>
                <th style={{ padding: '14px 16px' }}>Fulfillment / Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading sales data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No sales or bills found for the selected view.</td></tr>
              ) : (
                filtered.map(tx => (
                  <tr key={tx.txId} style={{ borderBottom: '1px solid var(--dark-700)' }}>
                    {/* Channel */}
                    <td style={{ padding: '14px 16px' }}>
                      {tx.channel === 'online' ? (
                        <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>🌐 Online</span>
                      ) : (
                        <span className="badge badge-yellow" style={{ fontSize: '0.72rem' }}>🏬 POS Counter</span>
                      )}
                    </td>

                    {/* ID */}
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: 'var(--brand-400)' }}>{tx.txId}</strong>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>

                    {/* Customer. The address rides along here rather than in a
                        column of its own: a counter bill has no delivery
                        address, and the online rows still need one to pack by. */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{tx.customer}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tx.phone || '—'}</div>
                      {tx.channel === 'online' && addressOf(tx) && (
                        <div
                          className="order-address-cell"
                          style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={addressOf(tx)}
                        >
                          {tx.addressDetails?.label ? <strong>{tx.addressDetails.label}: </strong> : null}{addressOf(tx)}
                        </div>
                      )}
                    </td>

                    {/* Items */}
                    <td style={{ padding: '14px 16px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }} title={tx.itemsSummary}>
                      {tx.itemsSummary || '—'}
                    </td>

                    {/* Total */}
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--brand-400)' }}>
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>

                    {/* Payment Mode */}
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                        {tx.paymentMethod}
                      </span>
                    </td>

                    {/* Fulfillment */}
                    <td style={{ padding: '14px 16px' }}>
                      {tx.channel === 'online' ? (
                        <>
                          <span className={`badge badge-${STATUS_COLORS[tx.statusText] || 'gray'}`}>
                            {tx.statusText}
                          </span>
                          {tx.stockShortfall && (
                            <span className="badge badge-red" style={{ marginLeft: 6 }} title="Paid after stock ran out — check inventory">Stock short</span>
                          )}
                        </>
                      ) : (
                        <span className="badge badge-green">
                          Completed (Counter POS)
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {tx.channel === 'online' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <WhatsAppStatus order={tx} sending={sendingId === tx.id} onSend={sendWhatsApp} />
                          <select
                            className="filter-select"
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            value={tx.deliveryStatus || tx.status}
                            onChange={e => updateStatus(tx.id, e.target.value)}
                          >
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      ) : (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          onClick={() => setSelectedInvoice(tx)}
                        >
                          <Eye size={12} /> View Bill
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View POS Invoice Modal */}
      {selectedInvoice && (
        <div className="modal-backdrop" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', background: 'var(--dark-900)', borderRadius: '12px', border: '1px solid var(--dark-700)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color="#fbbf24" /> POS Invoice Details
              </h3>
              <button className="btn btn-ghost" onClick={() => setSelectedInvoice(null)} style={{ padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.6 }}>
              <div><strong>Invoice ID:</strong> {selectedInvoice.id}</div>
              <div><strong>Date:</strong> {selectedInvoice.date ? new Date(selectedInvoice.date).toLocaleString('en-IN') : '—'}</div>
              <div><strong>Customer:</strong> {selectedInvoice.customerName || 'Walk-in Customer'}</div>
              <div><strong>Phone:</strong> {selectedInvoice.customerPhone || '—'}</div>
              <div><strong>Payment Mode:</strong> {selectedInvoice.paymentMode || 'Cash'}</div>
              <div><strong>Cashier:</strong> {selectedInvoice.cashier || 'Counter Staff'}</div>
            </div>

            <div style={{ borderTop: '1px solid var(--dark-700)', paddingTop: '12px', marginBottom: '16px' }}>
              <strong style={{ fontSize: '0.85rem' }}>Billed Items:</strong>
              <div style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {Array.isArray(selectedInvoice.items) && selectedInvoice.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px dashed var(--dark-700)' }}>
                    <span>{it.name || it.productName || 'Product'} x{it.qty || 1}</span>
                    <span>₹{(Number(it.price || 0) * Number(it.qty || 1)).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-400)', borderTop: '1px solid var(--dark-700)', paddingTop: '12px' }}>
              <span>Grand Total:</span>
              <span>₹{Number(selectedInvoice.grandTotal || selectedInvoice.total || 0).toLocaleString('en-IN')}</span>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
