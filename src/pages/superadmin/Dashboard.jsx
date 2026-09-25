import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Store, Users, ShieldCheck, Activity, ArrowUpRight, ArrowRight, MapPin, UserCheck, Clock, FileText, CheckCircle2, BarChart3, FileSpreadsheet, Sparkles } from 'lucide-react'

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [statsRes, logsRes] = await Promise.all([
        axios.get('/api/superadmin/stats'),
        axios.get('/api/superadmin/work-logs?limit=6')
      ])
      if (statsRes.data?.success) setStats(statsRes.data.data)
      if (logsRes.data?.success) setRecentLogs(logsRes.data.logs || [])
    } catch (err) {
      console.error('Failed to load superadmin stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Store Locations',
      value: stats?.totalStores || 0,
      sub: `${stats?.activeStores || 0} active locations`,
      icon: <Store size={22} />,
      tone: 'sa-tone-blue',
      link: '/superadmin/stores'
    },
    {
      title: 'Store Admins',
      value: stats?.totalAdmins || 0,
      sub: 'Assigned location heads',
      icon: <UserCheck size={22} />,
      tone: 'sa-tone-violet',
      link: '/superadmin/users?role=admin'
    },
    {
      title: 'Active Staff Members',
      value: (stats?.totalEmployees || 0) + (stats?.totalBilling || 0) + (stats?.totalDelivery || 0),
      sub: `${stats?.totalBilling || 0} Billing · ${stats?.totalDelivery || 0} Delivery · ${stats?.totalEmployees || 0} ERP`,
      icon: <Users size={22} />,
      tone: 'sa-tone-green',
      link: '/superadmin/users'
    },
    {
      title: 'Surveillance Audit Logs',
      value: stats?.totalActivityLogs || 0,
      sub: 'Action & option events monitored',
      icon: <Activity size={22} />,
      tone: 'sa-tone-amber',
      link: '/superadmin/logs'
    }
  ]

  return (
    <div className="sa-page">
      {/* Header Banner */}
      <section className="sa-hero">
        <div>
          <div className="sa-eyebrow"><Sparkles size={14} /> Enterprise Overview</div>
          <h1 className="sa-hero-title">Multi-Store Control Center</h1>
          <p className="sa-hero-text">
            Root supervision of all store branches, regional administrators, and staff hierarchy.
            Granularly configure feature visibility and track real-time activity across every portal.
          </p>
        </div>
        <div className="sa-actions">
          <Link to="/superadmin/analytics" className="sa-btn sa-btn--light">
            <BarChart3 size={16} /> All Shops Analytics & Excel
          </Link>
          <Link to="/superadmin/stores" className="sa-btn sa-btn--glass">
            <Store size={16} /> Manage Stores
          </Link>
          <Link to="/superadmin/users" className="sa-btn sa-btn--glass">
            <Users size={16} /> Create Personnel
          </Link>
        </div>
      </section>

      {/* KPI Stat Cards */}
      <div className="sa-stats">
        {statCards.map((card, idx) => (
          <Link key={idx} to={card.link} className={`sa-stat ${card.tone}`}>
            <div className="sa-stat-top">
              <div className="sa-stat-icon">{card.icon}</div>
              <span className="sa-stat-arrow"><ArrowUpRight size={16} /></span>
            </div>
            <div>
              <div className="sa-stat-label">{card.title}</div>
              <div className="sa-stat-value">{loading ? '...' : card.value}</div>
              <div className="sa-stat-sub">{card.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two Column Layout: Stores Overview & Recent Work Logs */}
      <div className="sa-grid-2">
        {/* Stores Card */}
        <section className="sa-card">
          <div className="sa-card-head">
            <div>
              <h2 className="sa-card-title">Store Locations & Heads</h2>
              <div className="sa-card-sub">Active hubs and assigned administrators</div>
            </div>
            <Link to="/superadmin/stores" className="sa-link">View All Stores <ArrowRight size={14} /></Link>
          </div>

          <div className="sa-card-body">
            <div className="sa-list">
              {(stats?.stores || []).slice(0, 5).map(store => (
                <div key={store.id} className="sa-row">
                  <div className="sa-feed-icon sa-tone-blue"><MapPin size={16} /></div>
                  <div className="sa-row-main">
                    <div className="sa-row-title">
                      {store.name}
                      <span className="sa-code">{store.code}</span>
                    </div>
                    <div className="sa-row-meta">
                      Head Admin: <strong>{store.adminName || 'Unassigned'}</strong> · {store.location}
                    </div>
                  </div>
                  <span className="sa-badge sa-tone-green">{store.staffCount || 0} Personnel</span>
                </div>
              ))}
              {(!stats?.stores || stats.stores.length === 0) && (
                <div className="sa-empty">
                  <div className="sa-empty-icon"><Store size={26} /></div>
                  <div className="sa-empty-title">No stores found.</div>
                  <div className="sa-empty-text">Add a store location to see its head admin and team here.</div>
                  <Link to="/superadmin/stores" className="sa-btn sa-btn--ghost sa-btn--sm">Manage Stores</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Live Work Log Feed */}
        <section className="sa-card">
          <div className="sa-card-head">
            <div>
              <h2 className="sa-card-title">Live Work Log & Audit</h2>
              <div className="sa-card-sub">Every setting, invoice, product, or role change tracked</div>
            </div>
            <Link to="/superadmin/logs" className="sa-link">Full Audit Tab <ArrowRight size={14} /></Link>
          </div>

          <div className="sa-card-body">
            <div className="sa-list">
              {recentLogs.map(log => (
                <div key={log.id} className="sa-row" style={{ alignItems: 'flex-start' }}>
                  <div className={`sa-feed-icon ${log.action.includes('DELETE') ? 'sa-tone-rose' : log.action.includes('CREATE') ? 'sa-tone-green' : 'sa-tone-violet'}`}>
                    <Activity size={16} />
                  </div>
                  <div className="sa-row-main">
                    <div className="sa-row-title">
                      {log.userName} <span className="sa-badge sa-badge--caps">{log.userRole}</span>
                    </div>
                    <div className="sa-row-meta">{log.description}</div>
                    {log.storeName && (
                      <div className="sa-row-meta"><MapPin size={11} /> {log.storeName}</div>
                    )}
                  </div>
                  <span className="sa-row-time">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {recentLogs.length === 0 && (
                <div className="sa-empty">
                  <div className="sa-empty-icon"><Activity size={26} /></div>
                  <div className="sa-empty-title">No activity logs recorded yet.</div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
