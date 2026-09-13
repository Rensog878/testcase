import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { Menu } from 'lucide-react'

const ADMIN_NAV = [
  {
    title: 'DASHBOARD',
    links: [
      { to: '/admin',              end: true, icon: '📊', label: 'Overview' },
      { to: '/admin/analytics',              icon: '📈', label: 'Analytics' },
    ]
  },
  {
    title: 'CONTENT',
    links: [
      { to: '/admin/cms',         icon: '✏️', label: 'Live CMS Editor' },
      { to: '/admin/products',    icon: '🌿', label: 'Products Master' },
      { to: '/admin/blogs',       icon: '📖', label: 'Blog Articles' },
      { to: '/admin/videos',      icon: '🎬', label: 'Video Library' },
    ]
  },
  {
    title: 'OPERATIONS',
    links: [
      { to: '/admin/users',        icon: '👤', label: 'Users & Credentials' },
      { to: '/admin/profile-fields', icon: '🧾', label: 'Profile Form Builder' },
      { to: '/admin/orders',       icon: '📦', label: 'Order Management' },
      { to: '/admin/subscribers',  icon: '📩', label: 'Advisory Subscribers' },
      { to: '/admin/employees',    icon: '👥', label: 'Employees' },
    ]
  },
  {
    title: 'SUPPORT',
    links: [
      { to: '/admin/support-tickets', icon: '🎫', label: 'Support Tickets' },
      { to: '/admin/tickets', icon: '🔔', label: 'Notifications' },
      { to: '/admin/chat',    icon: '💬', label: 'Chat Records' },
    ]
  }
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar items={ADMIN_NAV} roleName="Admin" roleEmoji="🛡️" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu"><Menu size={20} /></button>
            <div>
              <div className="topbar-title">Dashboard</div>
              <div className="topbar-subtitle">Sathya Bio Enterprise Management</div>
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LanguageSwitcher />
            <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>ADMIN</span>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  )
}

