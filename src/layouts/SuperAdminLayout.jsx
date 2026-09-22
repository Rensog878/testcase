import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { Menu, LayoutDashboard, Store, Users, ShieldCheck, Activity, ShieldAlert, Sparkles, BarChart3 } from 'lucide-react'

const SUPERADMIN_NAV = [
  {
    title: 'ENTERPRISE CONTROL',
    links: [
      { to: '/superadmin', end: true, icon: <LayoutDashboard size={16} />, label: 'Control Center' },
      { to: '/superadmin/analytics', icon: <BarChart3 size={16} />, label: 'All Shops Analytics' },
      { to: '/superadmin/stores', icon: <Store size={16} />, label: 'Store Locations' },
    ]
  },
  {
    title: 'ACCESS & HIERARCHY',
    links: [
      { to: '/superadmin/users', icon: <Users size={16} />, label: 'Personnel & Hierarchy' },
      { to: '/superadmin/permissions', icon: <ShieldCheck size={16} />, label: 'Feature Permissions' },
    ]
  },
  {
    title: 'AUDIT & SURVEILLANCE',
    links: [
      { to: '/superadmin/logs', icon: <Activity size={16} />, label: 'Work Log & Audit' },
    ]
  }
]

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  const links = SUPERADMIN_NAV.flatMap(section => section.links)
  const current = links.find(l => l.to === pathname) || links.find(l => !l.end && pathname.startsWith(`${l.to}/`))

  return (
    <div className="app-layout superadmin-theme">
      <Sidebar
        items={SUPERADMIN_NAV}
        roleName="Super Admin"
        roleIcon={ShieldAlert}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        <header className="topbar" style={{ background: '#0f172a', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              style={{ background: '#1e293b', color: '#f8fafc', border: 'none' }}
            >
              <Menu size={20} />
            </button>
            <div className="topbar-heading">
              <div className="topbar-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {current ? current.label : 'Control Center'}
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#3b82f6', color: '#fff', borderRadius: '12px', fontWeight: 600 }}>ROOT</span>
              </div>
              <div className="topbar-subtitle" style={{ color: '#94a3b8' }}>
                Super Admin · Sathyam Bio Multi-Store Enterprise Management & Surveillance
              </div>
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
              Audit Surveillance Live
            </span>
            <span className="badge" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>
              SUPER ADMIN
            </span>
          </div>
        </header>
        <main className="page-content" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
