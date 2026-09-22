import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Store, Users, ShieldCheck, Activity, ArrowUpRight, MapPin, UserCheck, Clock, FileText, CheckCircle2, BarChart3, FileSpreadsheet } from 'lucide-react'

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
      icon: <Store size={22} color="#3b82f6" />,
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.2)',
      link: '/superadmin/stores'
    },
    {
      title: 'Store Admins',
      value: stats?.totalAdmins || 0,
      sub: 'Assigned location heads',
      icon: <UserCheck size={22} color="#8b5cf6" />,
      bg: 'rgba(139, 92, 246, 0.1)',
      border: 'rgba(139, 92, 246, 0.2)',
      link: '/superadmin/users?role=admin'
    },
    {
      title: 'Active Staff Members',
      value: (stats?.totalEmployees || 0) + (stats?.totalBilling || 0) + (stats?.totalDelivery || 0),
      sub: `${stats?.totalBilling || 0} Billing · ${stats?.totalDelivery || 0} Delivery · ${stats?.totalEmployees || 0} ERP`,
      icon: <Users size={22} color="#10b981" />,
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.2)',
      link: '/superadmin/users'
    },
    {
      title: 'Surveillance Audit Logs',
      value: stats?.totalActivityLogs || 0,
      sub: 'Action & option events monitored',
      icon: <Activity size={22} color="#f59e0b" />,
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.2)',
      link: '/superadmin/logs'
    }
  ]

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '28px 32px',
        color: '#ffffff',
        marginBottom: '28px',
        border: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#60a5fa', fontWeight: 600 }}>Enterprise Overview</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '6px 0 8px', color: '#f8fafc' }}>
            Multi-Store Control Center
          </h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.92rem', maxWidth: '600px' }}>
            Root supervision of all store branches, regional administrators, and staff hierarchy.
            Granularly configure feature visibility and track real-time activity across every portal.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/superadmin/analytics"
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <BarChart3 size={16} /> All Shops Analytics & Excel
          </Link>
          <Link
            to="/superadmin/stores"
            style={{
              padding: '10px 18px',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Store size={16} /> Manage Stores
          </Link>
          <Link
            to="/superadmin/users"
            style={{
              padding: '10px 18px',
              background: '#334155',
              color: '#ffffff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users size={16} /> Create Personnel
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {statCards.map((card, idx) => (
          <Link
            key={idx}
            to={card.link}
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '22px',
              border: `1px solid ${card.border}`,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: card.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {card.icon}
              </div>
              <ArrowUpRight size={18} color="#94a3b8" />
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{card.title}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                {loading ? '...' : card.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{card.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two Column Layout: Stores Overview & Recent Work Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
        {/* Stores Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Store Locations & Heads</h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Active hubs and assigned administrators</div>
            </div>
            <Link to="/superadmin/stores" style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              View All Stores →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(stats?.stores || []).slice(0, 5).map(store => (
              <div
                key={store.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} color="#2563eb" /> {store.name}
                    <span style={{ fontSize: '0.72rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>{store.code}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Head Admin: <strong>{store.adminName || 'Unassigned'}</strong> · {store.location}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
                    {store.staffCount || 0} Personnel
                  </span>
                </div>
              </div>
            ))}
            {(!stats?.stores || stats.stores.length === 0) && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No stores found.</div>
            )}
          </div>
        </div>

        {/* Live Work Log Feed */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Live Work Log & Audit</h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Every setting, invoice, product, or role change tracked</div>
            </div>
            <Link to="/superadmin/logs" style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              Full Audit Tab →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLogs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: log.action.includes('DELETE') ? '#fee2e2' : log.action.includes('CREATE') ? '#dcfce7' : '#e0e7ff',
                  color: log.action.includes('DELETE') ? '#dc2626' : log.action.includes('CREATE') ? '#16a34a' : '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Activity size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                      {log.userName} <small style={{ color: '#64748b', fontWeight: 400 }}>({log.userRole})</small>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px', wordBreak: 'break-word' }}>
                    {log.description}
                  </div>
                  {log.storeName && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                      📍 {log.storeName}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                No activity logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
