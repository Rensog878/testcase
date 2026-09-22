import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { Menu, Truck, UserRound } from 'lucide-react'

const DEL_NAV = [
  { title: 'DELIVERIES', links: [{ to: '/delivery', end: true, icon: <Truck size={16} />, label: 'My Deliveries' }] },
  { title: 'MY ACCOUNT', links: [{ to: '/delivery/profile', icon: <UserRound size={16} />, label: 'My Profile' }] }
]

export default function DeliveryLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar items={DEL_NAV} roleName="Delivery" roleIcon={Truck} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu"><Menu size={20} /></button>
            <div>
              <div className="topbar-title">Dashboard</div>
              <div className="topbar-subtitle">Assigned Deliveries & OTP Verification</div>
            </div>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-orange topbar-role">DELIVERY</span>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  )
}

