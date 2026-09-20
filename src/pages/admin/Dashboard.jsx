import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState(false)
  useEffect(() => {
    axios.get('/api/admin/stats')
      .then(({ data }) => setStats(data.data))
      .catch(() => setStatsError(true))
  }, [])

  const show = value => (stats ? String(value ?? 0) : statsError ? '—' : '…')
  const note = text => (stats ? text : statsError ? 'Could not load' : 'Loading')
  const statCards = [
    { label: 'Total Omnichannel Revenue', value: stats ? `₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}` : show(), change: note(stats?.offlineRevenue ? `₹${Number(stats.onlineRevenue || 0).toLocaleString('en-IN')} web + ₹${Number(stats.offlineRevenue || 0).toLocaleString('en-IN')} counter` : `${stats?.paidOrders ?? 0} paid orders`), color: 'green', icon: '💰' },
    { label: 'Orders & Bills Today', value: show(stats?.ordersToday), change: note(`${stats?.totalOrders ?? 0} total (${stats?.onlineOrders ?? 0} web, ${stats?.offlineOrders ?? 0} counter)`), color: 'blue', icon: '📦' },
    { label: 'Active Products', value: show(stats?.activeProducts), change: note(`${stats?.totalProducts ?? 0} in catalog, in stock`), color: 'yellow', icon: '🌿' },
    { label: 'Subscribers', value: show(stats?.subscribers), change: note('Advisory sign-ups'), color: 'orange', icon: '📩' },
    { label: 'Wishlist Saves', value: show(stats?.wishlistSaves), change: note('Customer interest'), color: 'purple', icon: '❤️' },
    { label: 'Open Tickets', value: show(stats?.openTickets), change: note('Awaiting a reply'), color: 'red', icon: '🎫' },
    { label: 'Pending Deliveries', value: show(stats?.pendingDeliveries), change: note('Not yet delivered'), color: 'teal', icon: '🚚' },
  ]

  const quickLinks = [
    { icon: '✏️', label: 'Edit Live Content', sub: 'Hero, banners, advisory text', to: '/admin/cms' },
    { icon: '🌿', label: 'Manage Products', sub: 'Add, edit, 3-way visibility', to: '/admin/products' },
    { icon: '🎬', label: 'Video Demos', sub: 'Upload videos, embed in items & blogs', to: '/admin/videos' },
    { icon: '📦', label: 'Orders & Counter Bills', sub: 'Omnichannel sales & invoices', to: '/admin/orders' },
    { icon: '📈', label: '3-Mode Analytics', sub: 'Online, Offline & Omnichannel', to: '/admin/analytics' },
    { icon: '🎫', label: 'Support Tickets', sub: 'Field crop emergencies', to: '/admin/tickets' },
  ]

  const summaryBars = [42, 62, 58, 80, 74, 96, 88]
  const regionalDemand = [
    { city: 'Coimbatore', value: '₹18.2L', trend: '+16%' },
    { city: 'Trichy', value: '₹15.6L', trend: '+12%' },
    { city: 'Madurai', value: '₹14.1L', trend: '+9%' },
    { city: 'Erode', value: '₹12.8L', trend: '+7%' },
  ]
  const alerts = [
    { title: 'Inventory risk', text: 'CottonGuard stock below 2-days coverage', state: 'warning' },
    { title: 'Delivery SLA', text: '3 zones are above 90% on-time target', state: 'success' },
    { title: 'Renewal push', text: '12 farmers due for seasonal advisory follow-up', state: 'info' },
  ]

  return (
    <div className="animate-fade-in admin-overview">
      <div className="admin-hero">
        <div>
          <div className="eyebrow">Executive overview</div>
          <h1>Admin dashboard</h1>
          <p>Welcome back, {user?.name}.</p>
        </div>
        <div className="hero-badge-row">
          {stats && <span className="badge badge-blue">{stats.totalOrders ? `${stats.totalOrders} orders recorded` : 'No orders yet'}</span>}
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-change">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="analytics-grid dashboard-insights">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Demand trend</div>
            <span className="badge badge-purple">7 days</span>
          </div>
          <div className="empty-state" style={{ padding: '28px 12px' }}><div style={{ fontSize: '2rem' }}>📊</div><p>No demand data available yet</p></div>
          <div className="mini-graph-labels">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Regional performance</div>
          </div>
          <div className="region-list">
            <div className="empty-state" style={{ padding: '20px 12px' }}><p>No regional performance data yet</p></div>
          </div>
        </div>
      </div>

      <div className="dashboard-ops-grid">
        <div className="card executive-panel">
          <div className="card-header">
            <div className="card-title">Regional demand</div>
            <span className="badge badge-gray">Empty</span>
          </div>

          <div className="city-grid">
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '24px 12px' }}><p>Regional demand will appear after orders are created</p></div>
          </div>
        </div>

        <div className="card executive-panel">
          <div className="card-header">
            <div className="card-title">Operational alerts</div>
          </div>
          <div className="alert-list">
            <div className="empty-state" style={{ padding: '24px 12px' }}><div style={{ fontSize: '2rem' }}>✓</div><p>No operational alerts</p></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Quick Actions</div></div>
        <div className="quick-actions">
          {quickLinks.map(q => (
            <button key={q.to} type="button" className="quick-action" onClick={() => navigate(q.to)}>
              <span className="quick-action-icon" aria-hidden="true">{q.icon}</span>
              <span className="quick-action-text">
                <span className="quick-action-label">{q.label}</span>
                <span className="quick-action-sub">{q.sub}</span>
              </span>
              <span className="quick-action-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
