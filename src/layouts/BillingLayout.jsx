import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { Menu, FileText, History, Receipt, MapPin, UserRound } from 'lucide-react'

const BILL_NAV = [
  {
    title: 'BILLING',
    links: [
      { to: '/billing', end: true, icon: <FileText size={16} />, label: 'Create invoice', moduleKey: 'pos' },
      { to: '/billing/history', icon: <History size={16} />, label: 'Invoice history', moduleKey: 'history' },
    ]
  },
  {
    title: 'MY ACCOUNT',
    links: [
      { to: '/billing/profile', icon: <UserRound size={16} />, label: 'My Profile' },
    ]
  }
]

export default function BillingLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  const userPermissions = user?.permissions
  const hasWildcard = !userPermissions || user?.role === 'superadmin' || user?.role === 'admin' || (Array.isArray(userPermissions) && (userPermissions.length === 0 || userPermissions.includes('*')))

  const filteredNav = hasWildcard
    ? BILL_NAV
    : BILL_NAV.map(section => ({
        ...section,
        links: section.links.filter(l => !l.moduleKey || userPermissions.includes(l.moduleKey))
      })).filter(section => section.links.length > 0)

  return (
    <div className="app-layout">
      <Sidebar items={filteredNav} roleName="Billing" roleIcon={Receipt} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu"><Menu size={20} /></button>
            <div>
              <div className="topbar-title">Dashboard</div>
              <div className="topbar-subtitle">
                {user?.storeName ? `Store: ${user.storeName} · GST POS Terminal` : 'GST Invoice Generation — GSTIN: 33AFBFS8329C1Z6'}
              </div>
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user?.storeLocation && (
              <span className="badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e2e8f0', color: '#334155', fontWeight: 600 }}>
                <MapPin size={12} /> {user.storeLocation}
              </span>
            )}
            <span className="badge badge-teal topbar-role">BILLING</span>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  )
}
